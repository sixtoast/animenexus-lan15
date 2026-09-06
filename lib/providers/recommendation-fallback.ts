/**
 * Recommendation-chain fallbacks when AniList recommendations are unavailable.
 * Primary: Shikimori /similar (MAL id space).
 * Optional: Jikan /recommendations when MAL is reachable.
 */

import { SHIKI_ID_OFFSET } from "./shikimori";
import { JIKAN_BASE } from "../api";
import { withProviderLimit } from "../provider-rate-limit";

const SHIKI_BASE = "https://shikimori.one/api";
const SHIKI_ORIGIN = "https://shikimori.one";
const KITSU_BASE = "https://kitsu.app/api/edge";

export type FallbackRec = {
  id: number;
  title: string;
  relationType: "RECOMMENDED";
  format?: string;
  status?: string;
  image?: string;
  year?: number | null;
  score?: number | null;
};

function mapFormat(kind?: string): string {
  const m: Record<string, string> = {
    tv: "TV",
    movie: "MOVIE",
    ova: "OVA",
    ona: "ONA",
    special: "SPECIAL",
    music: "MUSIC",
    tv_special: "SPECIAL",
  };
  return m[(kind || "tv").toLowerCase()] || "TV";
}

function mapStatus(s?: string): string {
  const m: Record<string, string> = {
    released: "FINISHED",
    ongoing: "RELEASING",
    anons: "NOT_YET_RELEASED",
  };
  return m[(s || "").toLowerCase()] || (s || "Unknown").toUpperCase();
}

function imageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${SHIKI_ORIGIN}${path}`;
}

export async function resolveMalIdFromKitsu(
  kitsuNativeId: number,
): Promise<number | null> {
  if (!kitsuNativeId || kitsuNativeId < 1) return null;
  try {
    const res = await fetch(`${KITSU_BASE}/anime/${kitsuNativeId}/mappings`, {
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        attributes?: { externalSite?: string; externalId?: string };
      }[];
    };
    for (const row of json.data || []) {
      const site = row.attributes?.externalSite || "";
      if (site === "myanimelist/anime" || site === "myanimelist") {
        const id = parseInt(row.attributes?.externalId || "", 10);
        if (id > 0) return id;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveMalIdFromAnilist(
  anilistId: number,
): Promise<number | null> {
  if (!anilistId || anilistId < 1) return null;
  try {
    const url =
      `${KITSU_BASE}/mappings?filter[externalSite]=anilist/anime` +
      `&filter[externalId]=${anilistId}&include=item`;
    const res = await fetch(url, {
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      included?: { id?: string; type?: string }[];
    };
    const kitsuId = json.included?.find((x) => x.type === "anime")?.id;
    if (!kitsuId) return null;
    return resolveMalIdFromKitsu(parseInt(kitsuId, 10));
  } catch {
    return null;
  }
}

export async function fetchShikimoriSimilar(
  malId: number,
  limit = 12,
): Promise<FallbackRec[]> {
  if (!malId || malId < 1) return [];
  try {
    const res = await fetch(`${SHIKI_BASE}/animes/${malId}/similar`, {
      headers: { "User-Agent": "AnimeNexusLantern/1.0 (relations fallback)" },
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return [];
    const list = (await res.json()) as {
      id: number;
      name?: string;
      image?: { original?: string; preview?: string };
      kind?: string;
      score?: string;
      status?: string;
      aired_on?: string | null;
    }[];
    if (!Array.isArray(list)) return [];
    const out: FallbackRec[] = [];
    const seen = new Set<number>();
    for (const item of list.slice(0, limit)) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      const year = item.aired_on
        ? parseInt(item.aired_on.slice(0, 4), 10) || null
        : null;
      const score = item.score ? parseFloat(item.score) : null;
      out.push({
        id: SHIKI_ID_OFFSET + item.id,
        title: item.name || "Untitled",
        relationType: "RECOMMENDED",
        format: mapFormat(item.kind),
        status: mapStatus(item.status),
        image: imageUrl(item.image?.original || item.image?.preview),
        year,
        score,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchJikanRecommendations(
  malId: number,
  limit = 12,
): Promise<FallbackRec[]> {
  if (!malId || malId < 1) return [];
  try {
    return await withProviderLimit("jikan", async () => {
      const res = await fetch(`${JIKAN_BASE}/anime/${malId}/recommendations`, {
        next: { revalidate: 3600 },
      } as RequestInit);
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: {
          entry?: {
            mal_id?: number;
            title?: string;
            images?: {
              jpg?: { image_url?: string; large_image_url?: string };
            };
          };
        }[];
      };
      const out: FallbackRec[] = [];
      const seen = new Set<number>();
      for (const row of json.data || []) {
        const e = row.entry;
        if (!e?.mal_id || seen.has(e.mal_id)) continue;
        seen.add(e.mal_id);
        out.push({
          id: SHIKI_ID_OFFSET + e.mal_id,
          title: e.title || "Untitled",
          relationType: "RECOMMENDED",
          image:
            e.images?.jpg?.large_image_url ||
            e.images?.jpg?.image_url ||
            undefined,
        });
        if (out.length >= limit) break;
      }
      return out;
    });
  } catch {
    return [];
  }
}

export async function fetchFallbackRecommendations(
  malId: number,
  limit = 12,
): Promise<FallbackRec[]> {
  const shiki = await fetchShikimoriSimilar(malId, limit);
  if (shiki.length) return shiki;
  return fetchJikanRecommendations(malId, limit);
}
