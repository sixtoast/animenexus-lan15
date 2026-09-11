/**
 * Emergency static catalog — site never fully blank.
 * Builtin seed + anime-mapper CDN by MAL id.
 * No fs — must stay client-safe (catalog is imported from client components).
 */

import type { Anime, AnimePage, DiscoverFeed } from "../types";

export const STATIC_ID_OFFSET = 50_000_000;

type SeedItem = {
  id: number;
  malId?: number;
  title: string;
  image?: string;
  description?: string;
  score?: number;
  year?: number | string;
  episodes?: number;
  genre?: string;
  tags?: string[];
  format?: string;
};

let seedCache: Anime[] | null = null;

function mapSeed(s: SeedItem): Anime {
  const mal = s.malId || s.id;
  return {
    id: mal + STATIC_ID_OFFSET,
    idMal: mal,
    anilist_id: 0,
    title: s.title,
    image: s.image || "",
    description: s.description || "",
    episodes: s.episodes ?? 0,
    duration: 0,
    popularity: 0,
    score: s.score ?? 0,
    format: (s.format as Anime["format"]) || "TV",
    status: "FINISHED",
    year: s.year ?? "",
    genre: s.genre || (s.tags && s.tags[0]) || "N/A",
    tags: s.tags || (s.genre ? [s.genre] : []),
    source: "static",
  } as Anime;
}

const BUILTIN: SeedItem[] = [
  { id: 5114, title: "Fullmetal Alchemist: Brotherhood", score: 90, year: 2009, genre: "Action", tags: ["Action", "Adventure", "Drama"], episodes: 64 },
  { id: 9253, title: "Steins;Gate", score: 90, year: 2011, genre: "Sci-Fi", tags: ["Sci-Fi", "Thriller"], episodes: 24 },
  { id: 21, title: "One Piece", score: 87, year: 1999, genre: "Adventure", tags: ["Adventure", "Action", "Comedy"] },
  { id: 1535, title: "Death Note", score: 86, year: 2006, genre: "Mystery", tags: ["Mystery", "Psychological", "Thriller"], episodes: 37 },
  { id: 16498, title: "Attack on Titan", score: 88, year: 2013, genre: "Action", tags: ["Action", "Drama", "Suspense"], episodes: 25 },
  { id: 11061, title: "Hunter x Hunter (2011)", score: 90, year: 2011, genre: "Adventure", tags: ["Adventure", "Fantasy", "Action"], episodes: 148 },
  { id: 1, title: "Cowboy Bebop", score: 88, year: 1998, genre: "Action", tags: ["Action", "Sci-Fi"], episodes: 26 },
  { id: 820, title: "Gintama", score: 88, year: 2006, genre: "Comedy", tags: ["Comedy", "Action", "Sci-Fi"] },
  { id: 4181, title: "Clannad: After Story", score: 88, year: 2008, genre: "Drama", tags: ["Drama", "Romance", "Slice of Life"], episodes: 24 },
  { id: 32281, title: "Your Name", score: 88, year: 2016, genre: "Romance", tags: ["Romance", "Drama"], format: "MOVIE", episodes: 1 },
  { id: 28851, title: "A Silent Voice", score: 88, year: 2016, genre: "Drama", tags: ["Drama", "Romance"], format: "MOVIE", episodes: 1 },
  { id: 19, title: "Monster", score: 88, year: 2004, genre: "Drama", tags: ["Drama", "Mystery", "Suspense"], episodes: 74 },
  { id: 457, title: "Mushishi", score: 87, year: 2005, genre: "Slice of Life", tags: ["Slice of Life", "Fantasy", "Supernatural"], episodes: 26 },
  { id: 33352, title: "Violet Evergarden", score: 86, year: 2018, genre: "Drama", tags: ["Drama", "Fantasy"], episodes: 13 },
  { id: 34599, title: "Made in Abyss", score: 86, year: 2017, genre: "Adventure", tags: ["Adventure", "Drama", "Fantasy"], episodes: 13 },
  { id: 32937, title: "KonoSuba", score: 81, year: 2016, genre: "Comedy", tags: ["Comedy", "Fantasy", "Adventure"], episodes: 10 },
  { id: 38000, title: "Demon Slayer", score: 84, year: 2019, genre: "Action", tags: ["Action", "Fantasy"], episodes: 26 },
  { id: 40748, title: "Jujutsu Kaisen", score: 85, year: 2020, genre: "Action", tags: ["Action", "Fantasy"], episodes: 24 },
  { id: 30276, title: "One Punch Man", score: 84, year: 2015, genre: "Action", tags: ["Action", "Comedy"], episodes: 12 },
  { id: 4224, title: "Toradora!", score: 81, year: 2008, genre: "Romance", tags: ["Romance", "Comedy", "School"], episodes: 25 },
  { id: 23273, title: "Your Lie in April", score: 85, year: 2014, genre: "Drama", tags: ["Drama", "Music", "Romance"], episodes: 22 },
  { id: 199, title: "Spirited Away", score: 88, year: 2001, genre: "Fantasy", tags: ["Fantasy", "Adventure"], format: "MOVIE", episodes: 1 },
  { id: 30015, title: "Re:Zero", score: 82, year: 2016, genre: "Drama", tags: ["Drama", "Fantasy", "Thriller"], episodes: 25 },
  { id: 9756, title: "Madoka Magica", score: 84, year: 2011, genre: "Drama", tags: ["Drama", "Fantasy", "Thriller"], episodes: 12 },
];

async function loadSeed(): Promise<Anime[]> {
  if (seedCache) return seedCache;
  seedCache = BUILTIN.map(mapSeed);
  return seedCache;
}

export async function staticDiscover(
  feed: DiscoverFeed,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  let list = await loadSeed();
  if (feed === "top") list = [...list].sort((a, b) => b.score - a.score);
  const start = (page - 1) * perPage;
  const slice = list.slice(start, start + perPage);
  return {
    data: slice,
    pagination: {
      total: list.length,
      currentPage: page,
      lastPage: Math.max(1, Math.ceil(list.length / perPage)),
      hasNextPage: start + perPage < list.length,
    },
  };
}

export async function staticSearch(
  search: string,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const q = search.toLowerCase().trim();
  const list = await loadSeed();
  const hit = !q
    ? list
    : list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
  const start = (page - 1) * perPage;
  return {
    data: hit.slice(start, start + perPage),
    pagination: {
      total: hit.length,
      currentPage: page,
      lastPage: Math.max(1, Math.ceil(hit.length / perPage)),
      hasNextPage: start + perPage < hit.length,
    },
  };
}

export async function staticByMalId(malId: number): Promise<Anime | null> {
  const list = await loadSeed();
  const local = list.find((a) => a.idMal === malId);
  if (local) return local;
  try {
    const bucket = String(Math.floor(malId / 1000)).padStart(3, "0");
    const url = `https://cdn.jsdelivr.net/gh/subhajeetch-fl/anime-mapper@main/data/anime/${bucket}/${malId}.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return null;
    const j = (await res.json()) as {
      id?: number;
      idMal?: number;
      title?: { romaji?: string; english?: string; native?: string };
      type?: string;
      episodeCount?: number | null;
      coverImage?: string;
      description?: string;
      averageScore?: number;
      seasonYear?: number;
      genres?: string[];
    };
    return {
      id: (j.idMal || j.id || malId) + STATIC_ID_OFFSET,
      idMal: j.idMal || malId,
      anilist_id: 0,
      title: j.title?.english || j.title?.romaji || "Unknown",
      titleNative: j.title?.native,
      image: j.coverImage || "",
      description: j.description || "",
      episodes: j.episodeCount ?? 0,
      duration: 0,
      popularity: 0,
      score: j.averageScore ?? 0,
      format: ((j.type || "TV").toUpperCase() as Anime["format"]) || "TV",
      status: "FINISHED",
      year: j.seasonYear ?? "",
      genre: j.genres?.[0] || "N/A",
      tags: j.genres || [],
      source: "anime-mapper",
    } as Anime;
  } catch {
    return null;
  }
}

export async function staticFiltered(
  filters: { search?: string; genre?: string },
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  if (filters.search?.trim()) {
    return staticSearch(filters.search.trim(), page, perPage);
  }
  const list = await loadSeed();
  const g = (filters.genre || "").toLowerCase();
  const hit = g
    ? list.filter(
        (a) =>
          a.genre.toLowerCase().includes(g) ||
          a.tags.some((t) => t.toLowerCase().includes(g)),
      )
    : list;
  const start = (page - 1) * perPage;
  return {
    data: hit.slice(start, start + perPage),
    pagination: {
      total: hit.length,
      currentPage: page,
      lastPage: Math.max(1, Math.ceil(hit.length / perPage)),
      hasNextPage: start + perPage < hit.length,
    },
  };
}
