/**
 * Simkl catalog bridge (API Expansion II Sprint 17).
 * Soft-fail without SIMKL_CLIENT_ID. Not a catalog replacement — id + history bridge.
 * Docs: https://api.simkl.org
 */

import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";
import type { AnimeIdentity } from "../anime-identity";
import { mapId } from "../anime-identity";

const BASE = "https://api.simkl.com";
const APP_NAME = "animenexus-lantern";
const APP_VERSION = "1.0";

export type SimklAnimeSummary = {
  simklId: number;
  title: string;
  year?: number;
  type?: string;
  status?: string;
  overview?: string;
  poster?: string;
  malId?: number;
  anidbId?: number;
  anilistId?: number;
  tmdbId?: string;
  imdbId?: string;
};

function clientId(): string {
  return (process.env.SIMKL_CLIENT_ID || "").trim().replace(/^['"]|['"]$/g, "");
}

export function isSimklConfigured(): boolean {
  return Boolean(clientId());
}

function commonQuery(): URLSearchParams {
  return new URLSearchParams({
    client_id: clientId(),
    "app-name": APP_NAME,
    "app-version": APP_VERSION,
  });
}

async function simklFetch(
  path: string,
  query: Record<string, string> = {},
  opts?: { redirect?: "manual" | "follow" },
): Promise<Response | null> {
  if (!isSimklConfigured()) return null;
  return withProviderLimit("simkl", async () => {
    const q = commonQuery();
    for (const [k, v] of Object.entries(query)) {
      if (v) q.set(k, v);
    }
    const url = `${BASE}${path}?${q}`;
    return fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": `${APP_NAME}/${APP_VERSION}`,
        "simkl-api-key": clientId(),
      },
      redirect: opts?.redirect || "follow",
      next: { revalidate: 3600 },
    });
  }).catch((e) => {
    console.warn("[simkl]", e instanceof Error ? e.message : e);
    return null;
  });
}

/** Parse simkl.com/anime/12345/... from Location header. */
function parseSimklIdFromLocation(location: string | null): number | null {
  if (!location) return null;
  const m = location.match(/\/(?:anime|tv)\/(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

/** Resolve external id → Simkl id via GET /redirect (HEAD/follow Location). */
export async function resolveSimklId(opts: {
  malId?: number;
  anidbId?: number;
  anilistId?: number;
  imdbId?: string;
  tmdbId?: string;
}): Promise<number | null> {
  if (!isSimklConfigured()) return null;

  const attempts: Record<string, string>[] = [];
  if (opts.malId) attempts.push({ mal: String(opts.malId) });
  if (opts.anilistId) attempts.push({ anilist: String(opts.anilistId) });
  if (opts.anidbId) attempts.push({ anidb: String(opts.anidbId) });
  if (opts.imdbId) attempts.push({ imdb: opts.imdbId });
  if (opts.tmdbId) attempts.push({ tmdb: String(opts.tmdbId) });

  for (const extra of attempts) {
    const cacheK = cacheKey(["simkl", "redirect", JSON.stringify(extra)]);
    const id = await dedupedFetch(
      cacheK,
      async () => {
        const res = await simklFetch("/redirect", { to: "simkl", ...extra }, {
          redirect: "manual",
        });
        if (!res) return null;
        const loc =
          res.headers.get("location") || res.headers.get("Location") || null;
        if (loc) return parseSimklIdFromLocation(loc);
        // Some clients auto-follow; try URL from final response
        if (res.url) return parseSimklIdFromLocation(res.url);
        return null;
      },
      CACHE_TTL.identity,
    ).catch(() => null);
    if (id) return id;
  }
  return null;
}

type SimklAnimeJson = {
  title?: string;
  year?: number;
  type?: string;
  status?: string;
  overview?: string;
  poster?: string;
  ids?: {
    simkl?: number;
    simkl_id?: number;
    mal?: string | number;
    anidb?: string | number;
    anilist?: string | number;
    tmdb?: string | number;
    imdb?: string;
  };
};

export async function fetchSimklAnime(
  simklId: number,
): Promise<SimklAnimeSummary | null> {
  if (!simklId || !isSimklConfigured()) return null;

  const cacheK = cacheKey(["simkl", "anime", simklId]);
  return dedupedFetch(
    cacheK,
    async () => {
      const res = await simklFetch(`/anime/${simklId}`, { extended: "full" });
      if (!res || !res.ok) return null;
      const j = (await res.json()) as SimklAnimeJson;
      const ids = j.ids || {};
      const sid = ids.simkl || ids.simkl_id || simklId;
      return {
        simklId: Number(sid),
        title: j.title || `Simkl #${simklId}`,
        year: j.year,
        type: j.type,
        status: j.status,
        overview: j.overview,
        poster: j.poster,
        malId: ids.mal != null ? Number(ids.mal) || undefined : undefined,
        anidbId: ids.anidb != null ? Number(ids.anidb) || undefined : undefined,
        anilistId:
          ids.anilist != null ? Number(ids.anilist) || undefined : undefined,
        tmdbId: ids.tmdb != null ? String(ids.tmdb) : undefined,
        imdbId: ids.imdb || undefined,
      };
    },
    CACHE_TTL.medium,
  ).catch(() => null);
}

/** Text search fallback when no external ids. */
export async function searchSimklAnime(
  q: string,
): Promise<SimklAnimeSummary[]> {
  if (!q.trim() || !isSimklConfigured()) return [];
  const cacheK = cacheKey(["simkl", "search", q.trim().toLowerCase()]);
  return dedupedFetch(
    cacheK,
    async () => {
      const res = await simklFetch("/search/anime", {
        q: q.trim(),
        extended: "full",
      });
      if (!res || !res.ok) return [];
      const arr = (await res.json()) as SimklAnimeJson[];
      if (!Array.isArray(arr)) return [];
      return arr.slice(0, 8).map((j) => {
        const ids = j.ids || {};
        const sid = Number(ids.simkl || ids.simkl_id || 0);
        return {
          simklId: sid,
          title: j.title || "",
          year: j.year,
          type: j.type,
          status: j.status,
          overview: j.overview,
          poster: j.poster,
          malId: ids.mal != null ? Number(ids.mal) || undefined : undefined,
          anidbId:
            ids.anidb != null ? Number(ids.anidb) || undefined : undefined,
          anilistId:
            ids.anilist != null ? Number(ids.anilist) || undefined : undefined,
          tmdbId: ids.tmdb != null ? String(ids.tmdb) : undefined,
          imdbId: ids.imdb || undefined,
        };
      });
    },
    CACHE_TTL.medium,
  ).catch(() => []);
}

/** Enrich identity with Simkl (+ any ids Simkl returns). */
export async function enrichIdentityFromSimkl(
  identity: AnimeIdentity,
): Promise<AnimeIdentity> {
  if (!isSimklConfigured()) return identity;
  if (identity.simklId) return identity;

  let simklId = await resolveSimklId({
    malId: identity.malId,
    anidbId: identity.anidbId,
    anilistId: identity.anilistId ?? undefined,
    imdbId: identity.imdbId,
    tmdbId: identity.tmdbId,
  });

  let summary: SimklAnimeSummary | null = null;
  if (simklId) {
    summary = await fetchSimklAnime(simklId);
  } else {
    const title =
      identity.titles.english || identity.titles.romaji || identity.titles.native;
    if (title) {
      const hits = await searchSimklAnime(title);
      const hit = hits[0];
      if (hit?.simklId) {
        simklId = hit.simklId;
        summary = hit;
        identity = mapId(identity, {
          source: "simkl",
          target: "simkl",
          targetId: simklId,
          confidence: 0.55,
          method: "title_match",
        });
      }
    }
  }

  if (!simklId) return identity;

  if (!identity.simklId) {
    identity = mapId(identity, {
      source: "simkl",
      target: "simkl",
      targetId: simklId,
      confidence: 0.9,
      method: "external_resource",
    });
  }

  if (summary) {
    if (summary.malId && !identity.malId) {
      identity = mapId(identity, {
        source: "simkl",
        target: "mal",
        targetId: summary.malId,
        confidence: 0.85,
        method: "external_resource",
      });
    }
    if (summary.anidbId && !identity.anidbId) {
      identity = mapId(identity, {
        source: "simkl",
        target: "anidb",
        targetId: summary.anidbId,
        confidence: 0.85,
        method: "external_resource",
      });
    }
    if (summary.imdbId && !identity.imdbId) {
      identity = mapId(identity, {
        source: "simkl",
        target: "imdb",
        targetId: summary.imdbId,
        confidence: 0.85,
        method: "external_resource",
      });
    }
    if (summary.tmdbId && !identity.tmdbId) {
      identity = mapId(identity, {
        source: "simkl",
        target: "tmdb",
        targetId: summary.tmdbId,
        confidence: 0.85,
        method: "external_resource",
      });
    }
  }

  return identity;
}

export function simklAnimeUrl(simklId: string | number): string {
  return `https://simkl.com/anime/${simklId}`;
}
