/**
 * Mood retrieval when AniList / Jikan / Kitsu are down.
 * Order: Shikimori (genre id) → MAL official search → Simkl → TMDB → curated static.
 */
import type { Anime } from "./types";
import { shikiFiltered } from "./providers/shikimori";
import {
  isMalOfficialConfigured,
  malOfficialSearch,
} from "./providers/mal-official";
import {
  isSimklConfigured,
  simklSearchAnime,
} from "./providers/simkl";
import {
  isTmdbConfigured,
  tmdbAnimeSearch,
} from "./providers/tmdb-anime";
import { staticFiltered } from "./providers/static-catalog";
import { STATIC_ID_OFFSET } from "./providers/static-catalog";

/** Shikimori anime genre ids (entry_type Anime). */
export const MOOD_SHIKI_GENRES: Record<string, number[]> = {
  destroy: [8, 40],
  comfort: [36],
  think: [40, 7, 24],
  laugh: [4],
  tense: [41, 14, 7],
  wonder: [10, 2, 24],
  gentle: [36, 22],
  chaotic: [4, 1],
  romance: [22],
  surprise: [],
};

export const MOOD_SEARCH_QUERIES: Record<string, string[]> = {
  destroy: ["tragedy drama", "emotional anime"],
  comfort: ["slice of life", "healing anime"],
  think: ["psychological anime", "mind game"],
  laugh: ["comedy anime", "gag anime"],
  tense: ["thriller anime", "suspense"],
  wonder: ["fantasy adventure", "made in abyss"],
  gentle: ["soft slice of life", "natsume"],
  chaotic: ["action comedy", "one punch"],
  romance: ["romance anime", "horimiya"],
  surprise: ["popular anime"],
};

type Curated = {
  malId: number;
  title: string;
  score: number;
  year: number;
  genres: string[];
};

export const MOOD_CURATED: Record<string, Curated[]> = {
  destroy: [
    { malId: 9989, title: "Anohana", score: 84, year: 2011, genres: ["Drama", "Supernatural"] },
    { malId: 23273, title: "Your Lie in April", score: 88, year: 2014, genres: ["Drama", "Music", "Romance"] },
    { malId: 2167, title: "Clannad After Story", score: 89, year: 2008, genres: ["Drama", "Romance"] },
    { malId: 4181, title: "Clannad", score: 81, year: 2007, genres: ["Drama", "Romance"] },
    { malId: 34599, title: "Made in Abyss", score: 88, year: 2017, genres: ["Adventure", "Drama", "Fantasy"] },
    { malId: 37510, title: "Vinland Saga", score: 88, year: 2019, genres: ["Action", "Adventure", "Drama"] },
    { malId: 9253, title: "Steins;Gate", score: 91, year: 2011, genres: ["Drama", "Sci-Fi", "Thriller"] },
    { malId: 6114, title: "Rainbow", score: 84, year: 2010, genres: ["Drama", "Historical"] },
  ],
  comfort: [
    { malId: 9617, title: "K-On!", score: 81, year: 2010, genres: ["Comedy", "Slice of Life"] },
    { malId: 12021, title: "Natsume Yuujinchou Shi", score: 88, year: 2012, genres: ["Drama", "Slice of Life"] },
    { malId: 21335, title: "Barakamon", score: 82, year: 2014, genres: ["Comedy", "Slice of Life"] },
    { malId: 18689, title: "Non Non Biyori", score: 81, year: 2013, genres: ["Comedy", "Slice of Life"] },
    { malId: 40839, title: "Laid-Back Camp Season 2", score: 85, year: 2021, genres: ["Slice of Life"] },
    { malId: 12365, title: "Yuru Yuri", score: 76, year: 2011, genres: ["Comedy", "Slice of Life"] },
    { malId: 10800, title: "Chihayafuru", score: 81, year: 2011, genres: ["Drama", "Slice of Life"] },
    { malId: 32998, title: "Flying Witch", score: 76, year: 2016, genres: ["Comedy", "Slice of Life"] },
  ],
  think: [
    { malId: 9253, title: "Steins;Gate", score: 91, year: 2011, genres: ["Drama", "Sci-Fi", "Thriller"] },
    { malId: 1575, title: "Code Geass", score: 86, year: 2006, genres: ["Action", "Drama", "Sci-Fi"] },
    { malId: 1535, title: "Death Note", score: 86, year: 2006, genres: ["Mystery", "Psychological", "Thriller"] },
    { malId: 19, title: "Monster", score: 88, year: 2004, genres: ["Drama", "Mystery", "Psychological"] },
    { malId: 339, title: "Serial Experiments Lain", score: 81, year: 1998, genres: ["Drama", "Mystery", "Psychological"] },
    { malId: 9756, title: "Madoka Magica", score: 84, year: 2011, genres: ["Drama", "Fantasy", "Thriller"] },
    { malId: 457, title: "Mushishi", score: 88, year: 2005, genres: ["Adventure", "Fantasy", "Mystery"] },
    { malId: 2904, title: "Code Geass R2", score: 89, year: 2008, genres: ["Action", "Drama", "Sci-Fi"] },
  ],
  laugh: [
    { malId: 918, title: "Gintama", score: 89, year: 2006, genres: ["Action", "Comedy", "Sci-Fi"] },
    { malId: 10165, title: "Nichijou", score: 83, year: 2011, genres: ["Comedy", "Slice of Life"] },
    { malId: 30831, title: "KonoSuba", score: 81, year: 2016, genres: ["Adventure", "Comedy", "Fantasy"] },
    { malId: 24705, title: "Assassination Classroom", score: 81, year: 2015, genres: ["Action", "Comedy"] },
    { malId: 205, title: "Samurai Champloo", score: 85, year: 2004, genres: ["Action", "Adventure", "Comedy"] },
    { malId: 30276, title: "One Punch Man", score: 86, year: 2015, genres: ["Action", "Comedy"] },
    { malId: 32182, title: "Mob Psycho 100", score: 84, year: 2016, genres: ["Action", "Comedy"] },
    { malId: 2001, title: "Gurren Lagann", score: 86, year: 2007, genres: ["Action", "Adventure", "Comedy"] },
  ],
  tense: [
    { malId: 1535, title: "Death Note", score: 86, year: 2006, genres: ["Mystery", "Psychological", "Thriller"] },
    { malId: 22319, title: "Tokyo Ghoul", score: 76, year: 2014, genres: ["Action", "Drama", "Horror"] },
    { malId: 19, title: "Monster", score: 88, year: 2004, genres: ["Drama", "Mystery", "Psychological"] },
    { malId: 13601, title: "Psycho-Pass", score: 83, year: 2012, genres: ["Action", "Sci-Fi", "Thriller"] },
    { malId: 28223, title: "Death Parade", score: 81, year: 2015, genres: ["Drama", "Mystery", "Psychological"] },
    { malId: 31043, title: "Erased", score: 83, year: 2016, genres: ["Mystery", "Psychological"] },
    { malId: 40028, title: "Attack on Titan Final", score: 91, year: 2020, genres: ["Action", "Drama"] },
    { malId: 16498, title: "Attack on Titan", score: 85, year: 2013, genres: ["Action", "Drama"] },
  ],
  wonder: [
    { malId: 457, title: "Mushishi", score: 88, year: 2005, genres: ["Adventure", "Fantasy", "Mystery"] },
    { malId: 199, title: "Spirited Away", score: 88, year: 2001, genres: ["Adventure", "Fantasy"] },
    { malId: 5114, title: "Fullmetal Alchemist Brotherhood", score: 91, year: 2009, genres: ["Action", "Adventure", "Drama"] },
    { malId: 34599, title: "Made in Abyss", score: 88, year: 2017, genres: ["Adventure", "Drama", "Fantasy"] },
    { malId: 11061, title: "Hunter x Hunter (2011)", score: 91, year: 2011, genres: ["Action", "Adventure", "Fantasy"] },
    { malId: 1, title: "Cowboy Bebop", score: 88, year: 1998, genres: ["Action", "Sci-Fi"] },
    { malId: 33, title: "Berserk", score: 87, year: 1997, genres: ["Action", "Adventure", "Drama"] },
    { malId: 38000, title: "Demon Slayer", score: 86, year: 2019, genres: ["Action", "Fantasy"] },
  ],
  gentle: [
    { malId: 12021, title: "Natsume Yuujinchou Shi", score: 88, year: 2012, genres: ["Drama", "Slice of Life"] },
    { malId: 21335, title: "Barakamon", score: 82, year: 2014, genres: ["Comedy", "Slice of Life"] },
    { malId: 18689, title: "Non Non Biyori", score: 81, year: 2013, genres: ["Comedy", "Slice of Life"] },
    { malId: 9617, title: "K-On!", score: 81, year: 2010, genres: ["Comedy", "Slice of Life"] },
    { malId: 40839, title: "Laid-Back Camp S2", score: 85, year: 2021, genres: ["Slice of Life"] },
    { malId: 32998, title: "Flying Witch", score: 76, year: 2016, genres: ["Comedy", "Slice of Life"] },
    { malId: 12365, title: "Yuru Yuri", score: 76, year: 2011, genres: ["Comedy", "Slice of Life"] },
    { malId: 4224, title: "Toradora!", score: 81, year: 2008, genres: ["Comedy", "Romance"] },
  ],
  chaotic: [
    { malId: 30276, title: "One Punch Man", score: 86, year: 2015, genres: ["Action", "Comedy"] },
    { malId: 32182, title: "Mob Psycho 100", score: 84, year: 2016, genres: ["Action", "Comedy", "Supernatural"] },
    { malId: 918, title: "Gintama", score: 89, year: 2006, genres: ["Action", "Comedy"] },
    { malId: 30831, title: "KonoSuba", score: 81, year: 2016, genres: ["Adventure", "Comedy", "Fantasy"] },
    { malId: 2001, title: "Gurren Lagann", score: 86, year: 2007, genres: ["Action", "Adventure", "Comedy"] },
    { malId: 24705, title: "Assassination Classroom", score: 81, year: 2015, genres: ["Action", "Comedy"] },
    { malId: 205, title: "Samurai Champloo", score: 85, year: 2004, genres: ["Action", "Adventure", "Comedy"] },
    { malId: 1, title: "Cowboy Bebop", score: 88, year: 1998, genres: ["Action", "Sci-Fi"] },
  ],
  romance: [
    { malId: 4224, title: "Toradora!", score: 81, year: 2008, genres: ["Comedy", "Romance"] },
    { malId: 23273, title: "Your Lie in April", score: 88, year: 2014, genres: ["Drama", "Music", "Romance"] },
    { malId: 2167, title: "Clannad After Story", score: 89, year: 2008, genres: ["Drama", "Romance"] },
    { malId: 40456, title: "Horimiya", score: 84, year: 2021, genres: ["Romance", "Slice of Life"] },
    { malId: 4181, title: "Clannad", score: 81, year: 2007, genres: ["Drama", "Romance"] },
    { malId: 9989, title: "Anohana", score: 84, year: 2011, genres: ["Drama", "Supernatural"] },
    { malId: 10165, title: "Nichijou", score: 83, year: 2011, genres: ["Comedy", "Slice of Life"] },
    { malId: 14813, title: "Kaguya-sama", score: 88, year: 2019, genres: ["Comedy", "Romance"] },
  ],
  surprise: [
    { malId: 5114, title: "Fullmetal Alchemist: Brotherhood", score: 91, year: 2009, genres: ["Action", "Adventure"] },
    { malId: 11061, title: "Hunter x Hunter (2011)", score: 91, year: 2011, genres: ["Action", "Adventure"] },
    { malId: 9253, title: "Steins;Gate", score: 91, year: 2011, genres: ["Drama", "Sci-Fi"] },
    { malId: 1, title: "Cowboy Bebop", score: 88, year: 1998, genres: ["Action", "Sci-Fi"] },
    { malId: 918, title: "Gintama", score: 89, year: 2006, genres: ["Comedy"] },
    { malId: 1535, title: "Death Note", score: 86, year: 2006, genres: ["Mystery", "Thriller"] },
    { malId: 199, title: "Spirited Away", score: 88, year: 2001, genres: ["Fantasy"] },
    { malId: 21, title: "One Piece", score: 88, year: 1999, genres: ["Action", "Adventure"] },
  ],
};

function curatedToAnime(slug: string): Anime[] {
  return (MOOD_CURATED[slug] || []).map((c) => ({
    id: c.malId + STATIC_ID_OFFSET,
    idMal: c.malId,
    anilist_id: 0,
    title: c.title,
    image: `https://placehold.co/400x600/1a1210/e8a598?text=${encodeURIComponent(c.title.slice(0, 18))}`,
    description: `${c.title} — offline mood pool for "${slug}".`,
    episodes: 0,
    duration: 0,
    popularity: 0,
    score: c.score * 10,
    format: "TV" as Anime["format"],
    status: "FINISHED" as Anime["status"],
    year: c.year,
    genre: c.genres[0] || "N/A",
    tags: c.genres,
    source: "mood-curated",
  }));
}

export type PoolResult = { data: Anime[]; source: string; error?: string };

function slugGenreTags(slug: string): string[] {
  const m: Record<string, string[]> = {
    destroy: ["Drama", "Tragedy"],
    comfort: ["Slice of Life"],
    think: ["Psychological", "Mystery"],
    laugh: ["Comedy"],
    tense: ["Thriller", "Suspense"],
    wonder: ["Fantasy", "Adventure"],
    gentle: ["Slice of Life"],
    chaotic: ["Comedy", "Action"],
    romance: ["Romance"],
    surprise: [],
  };
  return m[slug] || [];
}

export async function poolShikiMood(slug: string): Promise<PoolResult[]> {
  const ids = MOOD_SHIKI_GENRES[slug] || [];
  const out: PoolResult[] = [];
  for (const gid of ids.slice(0, 3)) {
    try {
      const page = await shikiFiltered(
        { genre: String(gid), sort: "score" },
        1,
        30,
      );
      const data = page.data.map((a) => ({
        ...a,
        tags: a.tags?.length ? a.tags : slugGenreTags(slug),
      }));
      out.push({ data, source: `shiki:genre:${gid}` });
    } catch (e) {
      out.push({
        data: [],
        source: `shiki:genre:${gid}`,
        error: e instanceof Error ? e.message : "shiki failed",
      });
    }
  }
  return out;
}

export async function poolMalMood(slug: string): Promise<PoolResult[]> {
  if (!isMalOfficialConfigured()) {
    return [{ data: [], source: "mal:skip", error: "MAL_CLIENT_ID not set" }];
  }
  const queries = MOOD_SEARCH_QUERIES[slug] || [];
  const out: PoolResult[] = [];
  for (const q of queries.slice(0, 2)) {
    try {
      const page = await malOfficialSearch(q, 1, 24);
      const data = page.data.map((a) => ({
        ...a,
        tags: a.tags?.length ? a.tags : slugGenreTags(slug),
      }));
      out.push({ data, source: `mal:q:${q}` });
    } catch (e) {
      out.push({
        data: [],
        source: `mal:q:${q}`,
        error: e instanceof Error ? e.message : "mal failed",
      });
    }
  }
  return out;
}

export async function poolSimklMood(slug: string): Promise<PoolResult[]> {
  if (!isSimklConfigured()) {
    return [{ data: [], source: "simkl:skip", error: "SIMKL not set" }];
  }
  const queries = MOOD_SEARCH_QUERIES[slug] || [];
  const out: PoolResult[] = [];
  for (const q of queries.slice(0, 2)) {
    try {
      const page = await simklSearchAnime(q, 1, 20);
      const data = (page.data || []).map((a) => ({
        ...a,
        tags: a.tags?.length ? a.tags : slugGenreTags(slug),
      }));
      out.push({ data, source: `simkl:q:${q}` });
    } catch (e) {
      out.push({
        data: [],
        source: `simkl:q:${q}`,
        error: e instanceof Error ? e.message : "simkl failed",
      });
    }
  }
  return out;
}

export async function poolTmdbMood(slug: string): Promise<PoolResult[]> {
  if (!isTmdbConfigured()) {
    return [{ data: [], source: "tmdb:skip", error: "TMDB not set" }];
  }
  const queries = MOOD_SEARCH_QUERIES[slug] || [];
  const out: PoolResult[] = [];
  for (const q of queries.slice(0, 2)) {
    try {
      const page = await tmdbAnimeSearch(q, 1, 20);
      const data = (page.data || []).map((a) => ({
        ...a,
        tags: a.tags?.length ? a.tags : slugGenreTags(slug),
      }));
      out.push({ data, source: `tmdb:q:${q}` });
    } catch (e) {
      out.push({
        data: [],
        source: `tmdb:q:${q}`,
        error: e instanceof Error ? e.message : "tmdb failed",
      });
    }
  }
  return out;
}

export async function poolCuratedMood(slug: string): Promise<PoolResult> {
  return { data: curatedToAnime(slug), source: `curated:${slug}` };
}

export async function poolStaticGenre(
  genreHint: string,
): Promise<PoolResult> {
  try {
    const page = await staticFiltered({ genre: genreHint }, 1, 24);
    return { data: page.data, source: `static:${genreHint}` };
  } catch (e) {
    return {
      data: [],
      source: `static:${genreHint}`,
      error: e instanceof Error ? e.message : "static failed",
    };
  }
}
