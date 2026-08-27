/**
 * Watchmode — WHERE CAN THE USER WATCH THIS? (API Expansion II Sprint 12)
 * Soft-fail without WATCHMODE_API_KEY. Never implies the user owns a subscription.
 * Docs: https://api.watchmode.com/docs
 */

import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";
import type { AnimeIdentity } from "../anime-identity";
import { mapId } from "../anime-identity";

const BASE = "https://api.watchmode.com/v1";

export type StreamingType =
  | "subscription"
  | "free"
  | "ads"
  | "rent"
  | "buy"
  | "other";

export type StreamingAvailability = {
  provider: string;
  country: string;
  type: StreamingType;
  webUrl?: string;
  iosDeepLink?: string;
  androidDeepLink?: string;
  format?: string;
  price?: string | null;
  lastVerified: string;
  source: "watchmode";
};

export type WatchmodeTitleRef = {
  watchmodeId: number;
  name: string;
  type?: string;
  year?: number;
  imdbId?: string;
  tmdbId?: number;
};

function apiKey(): string {
  return (process.env.WATCHMODE_API_KEY || "").trim().replace(/^['"]|['"]$/g, "");
}

export function isWatchmodeConfigured(): boolean {
  return Boolean(apiKey());
}

function mapType(raw: string | undefined): StreamingType {
  const t = (raw || "").toLowerCase();
  if (t === "sub" || t === "subscription") return "subscription";
  if (t === "free") return "free";
  if (t === "tve" || t === "ads" || t === "free with ads") return "ads";
  if (t === "rent" || t === "rental") return "rent";
  if (t === "buy" || t === "purchase") return "buy";
  return "other";
}

async function wmGet<T>(path: string, query: Record<string, string> = {}): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;
  return withProviderLimit("watchmode", async () => {
    const q = new URLSearchParams({ ...query, apiKey: key });
    const url = `${BASE}${path}?${q}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (res.status === 429) {
      console.warn("[watchmode] rate limited");
      return null;
    }
    if (!res.ok) {
      console.warn("[watchmode] HTTP", res.status, path);
      return null;
    }
    return (await res.json()) as T;
  }).catch((e) => {
    console.warn("[watchmode]", e instanceof Error ? e.message : e);
    return null;
  });
}

type SearchHit = {
  id?: number;
  name?: string;
  type?: string;
  year?: number;
  imdb_id?: string;
  tmdb_id?: number;
};

/** Resolve Watchmode title id via IMDb / TMDB / name search. */
export async function resolveWatchmodeTitle(opts: {
  imdbId?: string;
  tmdbId?: string | number;
  title?: string;
  year?: number | string;
}): Promise<WatchmodeTitleRef | null> {
  if (!isWatchmodeConfigured()) return null;

  const cacheK = cacheKey([
    "watchmode",
    "resolve",
    opts.imdbId || "",
    opts.tmdbId || "",
    opts.title || "",
    opts.year || "",
  ]);

  return dedupedFetch(
    cacheK,
    async () => {
      if (opts.imdbId) {
        const data = await wmGet<{ title_results?: SearchHit[] }>("/search/", {
          search_field: "imdb_id",
          search_value: opts.imdbId.replace(/^tt/i, "tt").startsWith("tt")
            ? opts.imdbId
            : `tt${opts.imdbId}`,
        });
        const hit = data?.title_results?.[0];
        if (hit?.id) {
          return {
            watchmodeId: hit.id,
            name: hit.name || "",
            type: hit.type,
            year: hit.year,
            imdbId: hit.imdb_id,
            tmdbId: hit.tmdb_id,
          };
        }
      }

      if (opts.tmdbId) {
        const data = await wmGet<{ title_results?: SearchHit[] }>("/search/", {
          search_field: "tmdb_id",
          search_value: String(opts.tmdbId),
        });
        const hit = data?.title_results?.[0];
        if (hit?.id) {
          return {
            watchmodeId: hit.id,
            name: hit.name || "",
            type: hit.type,
            year: hit.year,
            imdbId: hit.imdb_id,
            tmdbId: hit.tmdb_id,
          };
        }
      }

      const title = opts.title?.trim();
      if (title && title.length >= 2) {
        const data = await wmGet<{ title_results?: SearchHit[] }>("/search/", {
          search_field: "name",
          search_value: title,
        });
        const results = data?.title_results || [];
        let hit = results[0];
        if (opts.year && results.length > 1) {
          const y = Number(opts.year);
          const better = results.find((r) => r.year === y);
          if (better) hit = better;
        }
        if (hit?.id) {
          return {
            watchmodeId: hit.id,
            name: hit.name || title,
            type: hit.type,
            year: hit.year,
            imdbId: hit.imdb_id,
            tmdbId: hit.tmdb_id,
          };
        }
      }

      return null;
    },
    CACHE_TTL.identity,
  ).catch(() => null);
}

type SourceRow = {
  source_id?: number;
  name?: string;
  type?: string;
  region?: string;
  ios_url?: string;
  android_url?: string;
  web_url?: string;
  format?: string;
  price?: string | number | null;
};

/** Streaming sources for a Watchmode title id in one country (ISO-2). */
export async function fetchWatchmodeSources(
  watchmodeId: number,
  country = "US",
): Promise<StreamingAvailability[]> {
  if (!watchmodeId || !isWatchmodeConfigured()) return [];

  const region = country.toUpperCase().slice(0, 2);
  const cacheK = cacheKey(["watchmode", "sources", watchmodeId, region]);

  return dedupedFetch(
    cacheK,
    async () => {
      const rows = await wmGet<SourceRow[]>(`/title/${watchmodeId}/sources/`, {
        regions: region,
      });
      if (!Array.isArray(rows)) return [];

      const now = new Date().toISOString();
      const out: StreamingAvailability[] = [];
      const seen = new Set<string>();

      for (const r of rows) {
        if (r.region && r.region.toUpperCase() !== region) continue;
        const provider = (r.name || "").trim();
        if (!provider) continue;
        const type = mapType(r.type);
        const dedupe = `${provider}|${type}|${region}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);

        out.push({
          provider,
          country: region,
          type,
          webUrl: r.web_url || undefined,
          iosDeepLink: r.ios_url || undefined,
          androidDeepLink: r.android_url || undefined,
          format: r.format || undefined,
          price: r.price != null ? String(r.price) : null,
          lastVerified: now,
          source: "watchmode",
        });
      }

      // Prefer subscription / free first
      const order: StreamingType[] = [
        "subscription",
        "free",
        "ads",
        "rent",
        "buy",
        "other",
      ];
      out.sort(
        (a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.provider.localeCompare(b.provider),
      );
      return out;
    },
    CACHE_TTL.medium,
  ).catch(() => []);
}

/**
 * End-to-end: identity → Watchmode id → sources for country.
 * Title match is last resort and does not write authoritative watchmodeId.
 */
export async function getStreamingAvailability(opts: {
  identity: AnimeIdentity;
  title?: string;
  year?: number | string;
  country?: string;
}): Promise<{
  availability: StreamingAvailability[];
  watchmodeId?: number;
  country: string;
  identity: AnimeIdentity;
}> {
  const country = (opts.country || process.env.WATCHMODE_DEFAULT_REGION || "US")
    .toUpperCase()
    .slice(0, 2);

  let identity = opts.identity;
  let wmId = identity.watchmodeId
    ? parseInt(identity.watchmodeId, 10)
    : NaN;

  if (!Number.isFinite(wmId) || wmId < 1) {
    const ref = await resolveWatchmodeTitle({
      imdbId: identity.imdbId,
      tmdbId: identity.tmdbId,
      title: opts.title || identity.titles.english || identity.titles.romaji,
      year: opts.year,
    });
    if (ref?.watchmodeId) {
      wmId = ref.watchmodeId;
      const method =
        identity.imdbId || identity.tmdbId ? "external_resource" : "title_match";
      const confidence = method === "title_match" ? 0.55 : 0.9;
      identity = mapId(identity, {
        source: "watchmode",
        target: "watchmode",
        targetId: wmId,
        confidence,
        method,
      });
      if (ref.imdbId && !identity.imdbId) {
        identity = mapId(identity, {
          source: "watchmode",
          target: "imdb",
          targetId: ref.imdbId,
          confidence: 0.85,
          method: "external_resource",
        });
      }
      if (ref.tmdbId && !identity.tmdbId) {
        identity = mapId(identity, {
          source: "watchmode",
          target: "tmdb",
          targetId: ref.tmdbId,
          confidence: 0.85,
          method: "external_resource",
        });
      }
    }
  }

  if (!Number.isFinite(wmId) || wmId < 1) {
    return { availability: [], country, identity };
  }

  const availability = await fetchWatchmodeSources(wmId, country);
  return { availability, watchmodeId: wmId, country, identity };
}

/** Split into "subscription/free" vs rent/buy for UI. */
export function partitionAvailability(rows: StreamingAvailability[]): {
  stream: StreamingAvailability[];
  rentOrBuy: StreamingAvailability[];
} {
  const stream: StreamingAvailability[] = [];
  const rentOrBuy: StreamingAvailability[] = [];
  for (const r of rows) {
    if (r.type === "rent" || r.type === "buy") rentOrBuy.push(r);
    else stream.push(r);
  }
  return { stream, rentOrBuy };
}
