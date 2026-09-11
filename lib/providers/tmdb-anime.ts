/**
 * TMDB as secondary anime-ish catalog (TV search/discover).
 * Requires TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN. Soft-fail when unset.
 */

import type { Anime, AnimePage, DiscoverFeed } from "../types";
import { withProviderLimit } from "../provider-rate-limit";

export const TMDB_ID_OFFSET = 40_000_000;

function apiKey(): string {
  return (process.env.TMDB_API_KEY || process.env.TMDB_READ_ACCESS_TOKEN || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

export function isTmdbConfigured(): boolean {
  return Boolean(apiKey());
}

type TmdbItem = {
  id: number;
  name?: string;
  title?: string;
  original_name?: string;
  original_title?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  release_date?: string;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
};

const GENRE_NAMES: Record<number, string> = {
  16: "Animation",
  18: "Drama",
  35: "Comedy",
  10759: "Action & Adventure",
  10765: "Sci-Fi & Fantasy",
};

function mapTmdb(item: TmdbItem, kind: "tv" | "movie"): Anime {
  const title =
    item.name || item.title || item.original_name || item.original_title || "Unknown";
  const date = item.first_air_date || item.release_date || "";
  const year = date ? parseInt(date.slice(0, 4), 10) : 0;
  const genres = (item.genre_ids || [])
    .map((id) => GENRE_NAMES[id])
    .filter(Boolean) as string[];
  const poster = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : "";
  return {
    id: item.id + TMDB_ID_OFFSET + (kind === "movie" ? 5_000_000 : 0),
    anilist_id: 0,
    title,
    image: poster,
    bannerImage: item.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
      : undefined,
    description: item.overview || "",
    episodes: 0,
    duration: 0,
    popularity: Math.round(item.popularity || 0),
    score: item.vote_average != null ? Math.round(item.vote_average * 10) : 0,
    format: kind === "movie" ? "MOVIE" : "TV",
    status: "FINISHED",
    year: Number.isFinite(year) && year > 0 ? year : "",
    genre: genres[0] || "Animation",
    tags: genres.length ? genres : ["Animation"],
    source: "tmdb",
  } as Anime;
}

async function tmdbGet(
  path: string,
  query: Record<string, string | number> = {},
): Promise<unknown> {
  const key = apiKey();
  if (!key) throw new Error("TMDB_API_KEY not configured");
  return withProviderLimit("tmdb", async () => {
    const q = new URLSearchParams({ language: "en-US" });
    for (const [k, v] of Object.entries(query)) q.set(k, String(v));
    const headers: Record<string, string> = { Accept: "application/json" };
    if (key.startsWith("eyJ")) {
      headers.Authorization = `Bearer ${key}`;
    } else {
      q.set("api_key", key);
    }
    const url = `https://api.themoviedb.org/3${path}?${q}`;
    const res = await fetch(url, {
      headers,
      next: { revalidate: 600 },
    } as RequestInit);
    if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
    return res.json();
  });
}

export async function tmdbAnimeSearch(
  search: string,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const json = (await tmdbGet("/search/tv", {
    query: search,
    page,
    include_adult: "false",
  })) as {
    results?: TmdbItem[];
    total_results?: number;
    total_pages?: number;
  };
  const rows = json.results || [];
  const data = rows.slice(0, perPage).map((r) => mapTmdb(r, "tv"));
  return {
    data,
    pagination: {
      total: json.total_results ?? data.length,
      currentPage: page,
      lastPage: json.total_pages ?? page,
      hasNextPage: page < (json.total_pages ?? page),
    },
  };
}

export async function tmdbAnimeDiscover(
  feed: DiscoverFeed,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const sort =
    feed === "top"
      ? "vote_average.desc"
      : "popularity.desc";
  const json = (await tmdbGet("/discover/tv", {
    page,
    sort_by: sort,
    with_genres: 16,
    with_origin_country: "JP",
    "vote_count.gte": feed === "top" ? 50 : 10,
    include_adult: "false",
  })) as {
    results?: TmdbItem[];
    total_results?: number;
    total_pages?: number;
  };
  const data = (json.results || []).slice(0, perPage).map((r) => mapTmdb(r, "tv"));
  return {
    data,
    pagination: {
      total: json.total_results ?? data.length,
      currentPage: page,
      lastPage: json.total_pages ?? page,
      hasNextPage: page < (json.total_pages ?? page),
    },
  };
}

export async function tmdbAnimeById(nativeId: number): Promise<Anime | null> {
  try {
    const json = (await tmdbGet(`/tv/${nativeId}`)) as TmdbItem & {
      genres?: { id: number; name: string }[];
    };
    if (!json?.id) return null;
    const a = mapTmdb(json, "tv");
    if (json.genres?.length) {
      a.tags = json.genres.map((g) => g.name);
      a.genre = json.genres[0]?.name || a.genre;
    }
    return a;
  } catch {
    return null;
  }
}
