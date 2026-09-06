/**
 * Kitsu media-relationships — franchise links when AniList GraphQL is unavailable.
 */

import { KITSU_ID_OFFSET } from "./kitsu";

const KITSU_BASE = "https://kitsu.app/api/edge";

const KITSU_ROLE_MAP: Record<string, string> = {
  sequel: "SEQUEL",
  prequel: "PREQUEL",
  parent_story: "PARENT",
  side_story: "SIDE_STORY",
  spinoff: "SPIN_OFF",
  adaptation: "ADAPTATION",
  alternative_setting: "ALTERNATIVE",
  alternative_version: "ALTERNATIVE",
  summary: "SUMMARY",
  full_story: "FULL_STORY",
  character: "CHARACTER",
  other: "OTHER",
};

type KitsuRelIncluded = {
  id: string;
  type: string;
  attributes?: {
    canonicalTitle?: string;
    titles?: { en?: string; en_jp?: string };
    subtype?: string;
    status?: string;
    startDate?: string | null;
    averageRating?: string | null;
    posterImage?: { large?: string; medium?: string };
  };
};

function mapStatus(s?: string): string {
  const m: Record<string, string> = {
    finished: "FINISHED",
    current: "RELEASING",
    tba: "NOT_YET_RELEASED",
    unreleased: "NOT_YET_RELEASED",
    upcoming: "NOT_YET_RELEASED",
  };
  return m[(s || "").toLowerCase()] || (s || "Unknown").toUpperCase();
}

function mapFormat(s?: string): string {
  const m: Record<string, string> = {
    TV: "TV",
    movie: "MOVIE",
    OVA: "OVA",
    ONA: "ONA",
    special: "SPECIAL",
    music: "MUSIC",
  };
  return m[s || ""] || (s || "TV").toUpperCase();
}

export async function resolveKitsuIdFromAnilist(
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
      data?: {
        relationships?: { item?: { data?: { id?: string; type?: string } } };
      }[];
    };
    const fromInclude = json.included?.find((x) => x.type === "anime")?.id;
    if (fromInclude) return parseInt(fromInclude, 10) || null;
    const itemId = json.data?.[0]?.relationships?.item?.data?.id;
    if (itemId) return parseInt(itemId, 10) || null;
    return null;
  } catch {
    return null;
  }
}

export type KitsuRelationRow = {
  id: number;
  title: string;
  relationType: string;
  format?: string;
  status?: string;
  image?: string;
  year?: number | null;
  score?: number | null;
};

export async function fetchKitsuRelations(
  kitsuNativeId: number,
): Promise<KitsuRelationRow[]> {
  if (!kitsuNativeId || kitsuNativeId < 1) return [];
  try {
    const url =
      `${KITSU_BASE}/anime/${kitsuNativeId}/media-relationships` +
      `?include=destination&page[limit]=20`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: {
        attributes?: { role?: string };
        relationships?: {
          destination?: { data?: { id?: string; type?: string } | null };
        };
      }[];
      included?: KitsuRelIncluded[];
    };
    const byId = new Map(
      (json.included || [])
        .filter((x) => x.type === "anime")
        .map((x) => [x.id, x]),
    );
    const out: KitsuRelationRow[] = [];
    const seen = new Set<number>();
    for (const edge of json.data || []) {
      const dest = edge.relationships?.destination?.data;
      if (!dest?.id || dest.type !== "anime") continue;
      const native = parseInt(dest.id, 10);
      if (!native || seen.has(native)) continue;
      seen.add(native);
      const inc = byId.get(dest.id);
      const attrs = inc?.attributes || {};
      const role = (edge.attributes?.role || "other").toLowerCase();
      const year = attrs.startDate
        ? parseInt(attrs.startDate.slice(0, 4), 10) || null
        : null;
      const rating = attrs.averageRating
        ? parseFloat(attrs.averageRating) / 10
        : null;
      out.push({
        id: KITSU_ID_OFFSET + native,
        title:
          attrs.titles?.en ||
          attrs.canonicalTitle ||
          attrs.titles?.en_jp ||
          "Untitled",
        relationType: KITSU_ROLE_MAP[role] || "OTHER",
        format: mapFormat(attrs.subtype),
        status: mapStatus(attrs.status),
        image: attrs.posterImage?.large || attrs.posterImage?.medium || undefined,
        year,
        score: rating,
      });
    }
    return out;
  } catch {
    return [];
  }
}
