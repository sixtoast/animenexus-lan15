/**
 * Fanart.tv artwork (API Expansion II Sprint 18).
 * Requires TVDB id + FANART_API_KEY. Soft-fail otherwise.
 * Never replaces AniList cover as canonical — supplemental only.
 * Docs: https://fanart.tv/api-info/ · webservice.fanart.tv/v3/tv/{tvdb}
 */

import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";
import type { AnimeIdentity } from "../anime-identity";
import type {
  ArtworkAsset,
  ArtworkCollection,
} from "../deep-metadata";
import { nowProvenance } from "../deep-metadata";

const BASE = "https://webservice.fanart.tv/v3";

type FanartImage = {
  id?: string;
  url?: string;
  lang?: string;
  likes?: string | number;
  width?: number;
  height?: number;
};

type FanartTvResponse = {
  name?: string;
  thetvdb_id?: string;
  hdclearart?: FanartImage[];
  clearlogo?: FanartImage[];
  hdtvlogo?: FanartImage[];
  tvposter?: FanartImage[];
  tvbanner?: FanartImage[];
  showbackground?: FanartImage[];
  seasonposter?: FanartImage[];
  characterart?: FanartImage[];
};

function apiKey(): string {
  return (process.env.FANART_API_KEY || "").trim().replace(/^['"]|['"]$/g, "");
}

export function isFanartConfigured(): boolean {
  return Boolean(apiKey());
}

function mapType(key: string): ArtworkAsset["type"] {
  if (key.includes("poster")) return "poster";
  if (key.includes("background") || key.includes("fanart")) return "background";
  if (key.includes("logo")) return "logo";
  if (key.includes("clearart") || key.includes("character")) return "clearart";
  if (key.includes("banner")) return "banner";
  return "other";
}

function toAssets(
  key: string,
  images: FanartImage[] | undefined,
  limit: number,
): ArtworkAsset[] {
  if (!images?.length) return [];
  const prov = nowProvenance("fanart", 0.85, "tvdb_lookup");
  return [...images]
    .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
    .slice(0, limit)
    .filter((img) => img.url)
    .map((img) => ({
      url: img.url!,
      type: mapType(key),
      language: img.lang || undefined,
      width: img.width,
      height: img.height,
      likes: img.likes != null ? Number(img.likes) : undefined,
      source: "fanart",
      provenance: prov,
    }));
}

export async function fetchFanartByTvdb(
  tvdbId: string | number,
): Promise<ArtworkCollection | null> {
  if (!isFanartConfigured()) return null;
  const id = String(tvdbId).replace(/^\D+/g, "");
  if (!id) return null;

  const cacheK = cacheKey(["fanart", "tv", id]);
  return dedupedFetch(
    cacheK,
    async () => {
      return withProviderLimit("fanart", async () => {
        const url = `${BASE}/tv/${id}?api_key=${encodeURIComponent(apiKey())}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          next: { revalidate: 86400 },
        });
        if (res.status === 404) return null;
        if (!res.ok) {
          console.warn("[fanart] HTTP", res.status);
          return null;
        }
        const j = (await res.json()) as FanartTvResponse;
        const assets: ArtworkAsset[] = [
          ...toAssets("tvposter", j.tvposter, 4),
          ...toAssets("showbackground", j.showbackground, 4),
          ...toAssets("tvbanner", j.tvbanner, 2),
          ...toAssets("hdtvlogo", j.hdtvlogo, 2),
          ...toAssets("clearlogo", j.clearlogo, 2),
          ...toAssets("hdclearart", j.hdclearart, 2),
        ];
        if (!assets.length) return null;
        return {
          assets,
          provenance: [nowProvenance("fanart", 0.85, "tvdb_lookup")],
        };
      });
    },
    CACHE_TTL.identity,
  ).catch(() => null);
}

/** Enrich from identity.tvdbId only — no inventing TVDB from title. */
export async function enrichArtworkFromFanart(
  identity: AnimeIdentity,
): Promise<ArtworkCollection | null> {
  if (!identity.tvdbId) return null;
  return fetchFanartByTvdb(identity.tvdbId);
}

export function pickPrimaryArtwork(
  art: ArtworkCollection | null | undefined,
): {
  poster?: string;
  background?: string;
  logo?: string;
} {
  if (!art?.assets?.length) return {};
  const by = (t: ArtworkAsset["type"]) =>
    art.assets.find((a) => a.type === t)?.url;
  return {
    poster: by("poster"),
    background: by("background"),
    logo: by("logo"),
  };
}
