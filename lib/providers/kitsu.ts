/**
 * Kitsu JSON:API fallback — https://kitsu.app/api/edge
 * No API key. Used when AniList GraphQL is unavailable.
 */

import type { Anime, AnimeFilters, AnimePage, DiscoverFeed } from "../types";

const KITSU_BASE = "https://kitsu.app/api/edge";
/** Offset so Kitsu ids do not collide with AniList ids in client routes. */
export const KITSU_ID_OFFSET = 10_000_000;

const FEED_SORT: Record<DiscoverFeed, string> = {
  trending: "-averageRating",
  popular: "-userCount",
  top: "-averageRating",
};

const SORT_MAP: Record<string, string> = {
  score: "-averageRating",
  popularity: "-userCount",
  title: "canonicalTitle",
  year: "-startDate",
};

function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

type KitsuAnime = {
  id: string;
  attributes?: {
    canonicalTitle?: string;
    titles?: { en?: string; en_jp?: string; ja_jp?: string };
    synopsis?: string;
    status?: string;
    subtype?: string;
    startDate?: string | null;
    averageRating?: string | null;
    userCount?: number;
    episodeCount?: number | null;
    episodeLength?: number | null;
    posterImage?: { large?: string; medium?: string; original?: string };
    coverImage?: { large?: string; original?: string } | null;
    nsfw?: boolean;
    slug?: string;
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

export function mapKitsuAnime(item: KitsuAnime): Anime {
  const a = item.attributes || {};
  const nativeId = parseInt(item.id, 10) || 0;
  const scoreRaw = a.averageRating ? parseFloat(a.averageRating) : 0;
  // Kitsu averageRating is 0–100
  const score = scoreRaw ? scoreRaw / 10 : 0;
  const year = a.startDate ? parseInt(a.startDate.slice(0, 4), 10) : "?";

  return {
    id: KITSU_ID_OFFSET + nativeId,
    title: a.titles?.en || a.canonicalTitle || a.titles?.en_jp || "Unknown",
    titleRomaji: a.titles?.en_jp || a.canonicalTitle || undefined,
    titleNative: a.titles?.ja_jp || undefined,
    description: stripHtml(a.synopsis) || "No description available.",
    genre: "N/A",
    tags: [],
    status: mapStatus(a.status),
    format: mapFormat(a.subtype),
    year,
    score,
    popularity: a.userCount || 0,
    image:
      a.posterImage?.large ||
      a.posterImage?.medium ||
      a.posterImage?.original ||
      "https://placehold.co/400x600/1a1a1a/555?text=No+Image",
    bannerImage: a.coverImage?.large || a.coverImage?.original || undefined,
    anilist_id: 0,
    url: a.slug ? `https://kitsu.app/anime/${a.slug}` : undefined,
    episodes: a.episodeCount ?? "?",
    duration: a.episodeLength || 24,
    isAdult: Boolean(a.nsfw),
    source: "kitsu",
  };
}

async function kitsuGet(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<unknown> {
  const url = new URL(`${KITSU_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const init: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
  };
  if (typeof window === "undefined") {
    init.next = { revalidate: 300 };
  }
  const res = await fetch(url.toString(), init);
  if (!res.ok) throw new Error(`Kitsu HTTP ${res.status}`);
  return res.json();
}

export async function kitsuDiscover(
  feed: DiscoverFeed = "trending",
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const sort = FEED_SORT[feed] || FEED_SORT.popular;
  const offset = Math.max(0, (page - 1) * perPage);
  const json = (await kitsuGet("/anime", {
    "page[limit]": perPage,
    "page[offset]": offset,
    sort,
  })) as { data?: KitsuAnime[]; meta?: { count?: number } };

  const data = (json.data || []).map(mapKitsuAnime);
  const total = json.meta?.count ?? data.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return {
    data,
    pagination: {
      total,
      currentPage: page,
      lastPage,
      hasNextPage: page < lastPage,
    },
  };
}

export async function kitsuSearch(
  search: string,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const offset = Math.max(0, (page - 1) * perPage);
  const json = (await kitsuGet("/anime", {
    "filter[text]": search,
    "page[limit]": perPage,
    "page[offset]": offset,
  })) as { data?: KitsuAnime[]; meta?: { count?: number } };

  const data = (json.data || []).map(mapKitsuAnime);
  const total = json.meta?.count ?? data.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return {
    data,
    pagination: {
      total,
      currentPage: page,
      lastPage,
      hasNextPage: page < lastPage,
    },
  };
}

export async function kitsuById(nativeId: number): Promise<Anime | null> {
  const json = (await kitsuGet(`/anime/${nativeId}`)) as {
    data?: KitsuAnime;
  };
  if (!json.data) return null;
  return mapKitsuAnime(json.data);
}

export async function kitsuFiltered(
  filters: AnimeFilters,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  if (filters.search?.trim()) {
    return kitsuSearch(filters.search.trim(), page, perPage);
  }
  const sort = SORT_MAP[filters.sort || "popularity"] || "-userCount";
  const offset = Math.max(0, (page - 1) * perPage);
  const params: Record<string, string | number> = {
    "page[limit]": perPage,
    "page[offset]": offset,
    sort,
  };
  if (filters.year) params["filter[seasonYear]"] = filters.year;
  if (filters.status) {
    const statusMap: Record<string, string> = {
      finished: "finished",
      FINISHED: "finished",
      currently_airing: "current",
      RELEASING: "current",
      not_yet_aired: "tba",
      NOT_YET_RELEASED: "tba",
    };
    params["filter[status]"] =
      statusMap[filters.status] || filters.status.toLowerCase();
  }
  const json = (await kitsuGet("/anime", params)) as {
    data?: KitsuAnime[];
    meta?: { count?: number };
  };
  const data = (json.data || []).map(mapKitsuAnime);
  const total = json.meta?.count ?? data.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  return {
    data,
    pagination: {
      total,
      currentPage: page,
      lastPage,
      hasNextPage: page < lastPage,
    },
  };
}
