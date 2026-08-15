/**
 * Shikimori REST fallback — https://shikimori.one/api
 * Public reads need a descriptive User-Agent (no login).
 * Used when AniList (and optionally Kitsu) are unavailable.
 */

import type { Anime, AnimeFilters, AnimePage, DiscoverFeed } from "../types";

const SHIKI_BASE = "https://shikimori.one/api";
const SHIKI_ORIGIN = "https://shikimori.one";
/** Offset so Shikimori ids do not collide with AniList / Kitsu ids. */
export const SHIKI_ID_OFFSET = 20_000_000;

const FEED_ORDER: Record<DiscoverFeed, string> = {
  trending: "popularity",
  popular: "popularity",
  top: "ranked",
};

const SORT_ORDER: Record<string, string> = {
  score: "ranked",
  popularity: "popularity",
  title: "name",
  year: "aired_on",
};

type ShikiAnime = {
  id: number;
  name?: string;
  russian?: string;
  image?: { original?: string; preview?: string };
  url?: string;
  kind?: string;
  score?: string;
  status?: string;
  episodes?: number;
  episodes_aired?: number;
  aired_on?: string | null;
  released_on?: string | null;
};

type ShikiAnimeFull = ShikiAnime & {
  english?: string[] | null;
  japanese?: string[] | null;
  synopsis?: string | null;
  description?: string | null;
  duration?: number;
  genres?: { name?: string; russian?: string }[];
  rating?: string;
};

function mapStatus(s?: string): string {
  const m: Record<string, string> = {
    released: "FINISHED",
    ongoing: "RELEASING",
    anons: "NOT_YET_RELEASED",
    latest: "RELEASING",
  };
  return m[(s || "").toLowerCase()] || (s || "Unknown").toUpperCase();
}

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

function imageUrl(path?: string): string {
  if (!path) return "https://placehold.co/400x600/1a1a1a/555?text=No+Image";
  if (path.startsWith("http")) return path;
  return `${SHIKI_ORIGIN}${path}`;
}

export function mapShikiAnime(item: ShikiAnime | ShikiAnimeFull): Anime {
  const scoreRaw = item.score ? parseFloat(item.score) : 0;
  const year = item.aired_on
    ? parseInt(item.aired_on.slice(0, 4), 10)
    : "?";
  const full = item as ShikiAnimeFull;
  const genres = (full.genres || [])
    .map((g) => g.name || g.russian || "")
    .filter(Boolean);
  const description =
    full.synopsis ||
    full.description ||
    "No description available.";

  return {
    id: SHIKI_ID_OFFSET + item.id,
    title:
      (full.english && full.english[0]) ||
      item.name ||
      item.russian ||
      "Unknown",
    titleRomaji: item.name || undefined,
    titleNative:
      (full.japanese && full.japanese[0]) || item.russian || undefined,
    description: String(description).replace(/\[.*?\]/g, "").trim(),
    genre: genres[0] || "N/A",
    tags: genres,
    status: mapStatus(item.status),
    format: mapFormat(item.kind),
    year,
    score: scoreRaw,
    popularity: 0,
    image: imageUrl(item.image?.original || item.image?.preview),
    anilist_id: 0,
    url: item.url ? `${SHIKI_ORIGIN}${item.url}` : undefined,
    episodes: item.episodes || item.episodes_aired || "?",
    duration: full.duration || 24,
    isAdult: (full.rating || "").toLowerCase().includes("rx"),
    source: "shikimori",
  };
}

async function shikiGet(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<unknown> {
  const url = new URL(`${SHIKI_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      // Shikimori requires a descriptive UA for public API access
      "User-Agent": "AnimeNexusLantern/1.0 (github.com/sixtoast/animenexus-lan15)",
      Accept: "application/json",
    },
    redirect: "follow",
  };
  if (typeof window === "undefined") {
    init.next = { revalidate: 300 };
  }
  const res = await fetch(url.toString(), init);
  if (!res.ok) throw new Error(`Shikimori HTTP ${res.status}`);
  return res.json();
}

export async function shikiDiscover(
  feed: DiscoverFeed = "trending",
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const order = FEED_ORDER[feed] || "popularity";
  const list = (await shikiGet("/animes", {
    limit: perPage,
    page,
    order,
  })) as ShikiAnime[];

  const data = (Array.isArray(list) ? list : []).map(mapShikiAnime);
  return {
    data,
    pagination: {
      total: data.length + (data.length >= perPage ? page * perPage : 0),
      currentPage: page,
      lastPage: data.length >= perPage ? page + 1 : page,
      hasNextPage: data.length >= perPage,
    },
  };
}

export async function shikiSearch(
  search: string,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const list = (await shikiGet("/animes", {
    search,
    limit: perPage,
    page,
  })) as ShikiAnime[];

  const data = (Array.isArray(list) ? list : []).map(mapShikiAnime);
  return {
    data,
    pagination: {
      total: data.length,
      currentPage: page,
      lastPage: data.length >= perPage ? page + 1 : page,
      hasNextPage: data.length >= perPage,
    },
  };
}

export async function shikiById(nativeId: number): Promise<Anime | null> {
  const item = (await shikiGet(`/animes/${nativeId}`)) as ShikiAnimeFull;
  if (!item?.id) return null;
  return mapShikiAnime(item);
}

export async function shikiFiltered(
  filters: AnimeFilters,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  if (filters.search?.trim()) {
    return shikiSearch(filters.search.trim(), page, perPage);
  }
  const order = SORT_ORDER[filters.sort || "popularity"] || "popularity";
  const params: Record<string, string | number> = {
    limit: perPage,
    page,
    order,
  };
  if (filters.year) {
    params.season = filters.year; // e.g. "2024" accepted as year filter loosely
  }
  if (filters.status) {
    const statusMap: Record<string, string> = {
      finished: "released",
      FINISHED: "released",
      currently_airing: "ongoing",
      RELEASING: "ongoing",
      not_yet_aired: "anons",
      NOT_YET_RELEASED: "anons",
    };
    params.status = statusMap[filters.status] || filters.status;
  }
  if (filters.genre) params.genre = filters.genre;
  if (filters.format) {
    params.kind = filters.format.toLowerCase().replace("_", "");
  }

  const list = (await shikiGet("/animes", params)) as ShikiAnime[];
  const data = (Array.isArray(list) ? list : []).map(mapShikiAnime);
  return {
    data,
    pagination: {
      total: data.length + (data.length >= perPage ? page * perPage : 0),
      currentPage: page,
      lastPage: data.length >= perPage ? page + 1 : page,
      hasNextPage: data.length >= perPage,
    },
  };
}
