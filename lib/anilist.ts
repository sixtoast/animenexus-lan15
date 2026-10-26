import type { Anime, AnimeFilters, AnimePage, DiscoverFeed } from "./types";
import {
  kitsuById,
  kitsuDiscover,
  kitsuFiltered,
  kitsuSearch,
  KITSU_ID_OFFSET,
} from "./providers/kitsu";
import {
  shikiById,
  shikiDiscover,
  shikiFiltered,
  shikiSearch,
  SHIKI_ID_OFFSET,
} from "./providers/shikimori";
import { catalogFallbacks } from "./catalog-fallbacks";
import {
  malOfficialById,
  isMalOfficialConfigured,
  MAL_OFFICIAL_ID_OFFSET,
} from "./providers/mal-official";
import {
  tmdbAnimeById,
  isTmdbConfigured,
  TMDB_ID_OFFSET,
} from "./providers/tmdb-anime";
import {
  staticByMalId,
  STATIC_ID_OFFSET,
} from "./providers/static-catalog";
import { CACHE_TTL, cacheKey, dedupedFetch } from "./api-cache";
import { withProviderLimit } from "./provider-rate-limit";

export const ANILIST_ENDPOINT = "https://graphql.anilist.co";

let lastSource: "anilist" | "kitsu" | "shikimori" | "mal" | "simkl" | "tmdb" | "static" | "jikan" = "anilist";
export function getLastCatalogSource() {
  return lastSource;
}

const FEED_SORT: Record<DiscoverFeed, string> = {
  trending: "TRENDING_DESC",
  popular: "POPULARITY_DESC",
  top: "SCORE_DESC",
};

const SORT_MAP: Record<string, string> = {
  score: "SCORE_DESC",
  popularity: "POPULARITY_DESC",
  title: "TITLE_ROMAJI",
  year: "START_DATE_DESC",
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

export function mapAniListMedia(item: Record<string, unknown>): Anime {
  const titleObj = (item.title as Record<string, string | null>) || {};
  const cover = (item.coverImage as Record<string, string | null>) || {};
  const start = (item.startDate as Record<string, number | null>) || {};
  const genres = (item.genres as string[]) || [];
  const avg = item.averageScore as number | null | undefined;

  return {
    id: item.id as number,
    title: titleObj.english || titleObj.romaji || "Unknown",
    titleRomaji: titleObj.romaji || undefined,
    titleNative: titleObj.native || undefined,
    description: stripHtml(item.description as string) || "No description available.",
    genre: genres[0] || "N/A",
    tags: Array.isArray(item.tags)
      ? (item.tags as {
          id?: number;
          name?: string;
          rank?: number;
          description?: string;
          category?: string;
          isGeneralSpoiler?: boolean;
          isMediaSpoiler?: boolean;
        }[])
          .slice()
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
          .map((tg) => tg.name)
          .filter((n): n is string => Boolean(n))
      : [],
    tagDetails: Array.isArray(item.tags)
      ? (item.tags as {
          id?: number;
          name?: string;
          rank?: number;
          description?: string;
          category?: string;
          isGeneralSpoiler?: boolean;
          isMediaSpoiler?: boolean;
        }[])
          .filter((tg) => Boolean(tg.name))
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
          .map((tg) => ({
            id: tg.id ?? tg.name!,
            name: tg.name!,
            description: tg.description ?? null,
            category: tg.category ?? null,
            rank: tg.rank ?? null,
            isGeneralSpoiler: Boolean(tg.isGeneralSpoiler),
            isMediaSpoiler: Boolean(tg.isMediaSpoiler),
            source: "anilist" as const,
          }))
      : undefined,
    idMal: (item.idMal as number) || null,
    status: (item.status as string) || "Unknown",
    format: (item.format as string) || "TV",
    year: start.year ?? "?",
    score: avg ? avg / 10 : 0,
    popularity: (item.popularity as number) || 0,
    image:
      cover.large ||
      cover.medium ||
      "https://placehold.co/400x600/1a1a1a/555?text=No+Image",
    bannerImage: (item.bannerImage as string) || undefined,
    anilist_id: item.id as number,
    url: (item.siteUrl as string) || undefined,
    episodes: (item.episodes as number) ?? "?",
    duration: (item.duration as number) || 24,
    isAdult: Boolean(item.isAdult),
    source: "anilist",
  };
}

type GqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function anilistFetchRaw<T>(
  query: string,
  variables: Record<string, unknown> = {},
  attempt = 0,
): Promise<T> {
  const init: RequestInit & { next?: { revalidate: number } } = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  };
  if (typeof window === "undefined") {
    init.next = { revalidate: 300 };
  }
  const res = await fetch(ANILIST_ENDPOINT, init);

  if (res.status === 429 && attempt < 1) {
    const ra = res.headers.get("Retry-After");
    const wait = ra ? Math.min(5000, parseInt(ra, 10) * 1000 || 1200) : 1200;
    await sleep(wait);
    return anilistFetchRaw(query, variables, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`AniList HTTP ${res.status}`);
  }

  const json = (await res.json()) as GqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("AniList returned empty data");
  }
  return json.data;
}

/** Rate-limited AniList GraphQL */
export async function anilistFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  return withProviderLimit("anilist", () => anilistFetchRaw<T>(query, variables));
}

async function withFallbacks<T>(
  label: string,
  primary: () => Promise<T>,
  fallbacks: { name: string; run: () => Promise<T> }[],
): Promise<T> {
  try {
    const result = await primary();
    lastSource = "anilist";
    return result;
  } catch (primaryErr) {
    const msg =
      primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.warn(`[anime-api] AniList ${label} failed: ${msg}`);

    let lastErr: unknown = primaryErr;
    for (const fb of fallbacks) {
      try {
        const result = await fb.run();
        const name = fb.name.toLowerCase();
        if (name.includes("kitsu")) lastSource = "kitsu";
        else if (name.includes("shikimori")) lastSource = "shikimori";
        else if (name.includes("mal")) lastSource = "mal";
        else if (name.includes("simkl")) lastSource = "simkl";
        else if (name.includes("tmdb")) lastSource = "tmdb";
        else if (name.includes("static")) lastSource = "static";
        else if (name.includes("jikan")) lastSource = "jikan";
        console.warn(`[anime-api] ${label} served via ${fb.name}`);
        return result;
      } catch (e) {
        lastErr = e;
        const m = e instanceof Error ? e.message : String(e);
        console.warn(`[anime-api] ${fb.name} ${label} failed: ${m}`);
      }
    }
    throw lastErr;
  }
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  description
  genres
  tags {
    id
    name
    description
    category
    rank
    isGeneralSpoiler
    isMediaSpoiler
  }
  idMal
  status
  format
  startDate { year }
  averageScore
  popularity
  coverImage { large medium }
  bannerImage
  siteUrl
  episodes
  duration
  isAdult
`;

async function anilistDiscover(
  feed: DiscoverFeed = "trending",
  page = 1,
  perPage = 24,
  adultFilter: AnimeFilters["adultFilter"] = "exclude",
): Promise<AnimePage> {
  const sort = FEED_SORT[feed] || FEED_SORT.trending;
  const isAdult =
    adultFilter === "only" ? true : adultFilter === "exclude" ? false : null;

  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $isAdult: Boolean) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(type: ANIME, sort: $sort, isAdult: $isAdult) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const variables: Record<string, unknown> = {
    page,
    perPage,
    sort: [sort],
  };
  if (isAdult !== null) variables.isAdult = isAdult;

  const data = await anilistFetch<{
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
      };
      media: Record<string, unknown>[];
    };
  }>(query, variables);

  return {
    data: (data.Page.media || []).map(mapAniListMedia),
    pagination: {
      total: data.Page.pageInfo.total ?? 0,
      currentPage: data.Page.pageInfo.currentPage,
      lastPage: data.Page.pageInfo.lastPage,
      hasNextPage: Boolean(data.Page.pageInfo.hasNextPage),
    },
  };
}

export async function fetchDiscover(
  feed: DiscoverFeed = "trending",
  page = 1,
  perPage = 24,
  adultFilter: AnimeFilters["adultFilter"] = "exclude",
): Promise<AnimePage> {
  const key = cacheKey(["discover", feed, page, perPage, adultFilter]);
  return dedupedFetch(
    key,
    () =>
      withFallbacks(
        "discover",
        () => anilistDiscover(feed, page, perPage, adultFilter),
        catalogFallbacks("discover", { feed, page, perPage }),
      ),
    CACHE_TTL.catalog,
  );
}

async function anilistSearch(
  search: string,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const query = `
    query ($page: Int, $perPage: Int, $search: String) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(type: ANIME, search: $search, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await anilistFetch<{
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
      };
      media: Record<string, unknown>[];
    };
  }>(query, { page, perPage, search });

  return {
    data: (data.Page.media || []).map(mapAniListMedia),
    pagination: {
      total: data.Page.pageInfo.total ?? 0,
      currentPage: data.Page.pageInfo.currentPage,
      lastPage: data.Page.pageInfo.lastPage,
      hasNextPage: Boolean(data.Page.pageInfo.hasNextPage),
    },
  };
}

export async function searchAnime(
  search: string,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const key = cacheKey(["search", search.trim().toLowerCase(), page, perPage]);
  return dedupedFetch(
    key,
    () =>
      withFallbacks(
        "search",
        () => anilistSearch(search, page, perPage),
        catalogFallbacks("search", { search, page, perPage }),
      ),
    CACHE_TTL.catalog,
  );
}

async function anilistById(id: number): Promise<Anime | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  const data = await anilistFetch<{ Media: Record<string, unknown> | null }>(
    query,
    { id },
  );
  if (!data.Media) return null;
  return mapAniListMedia(data.Media);
}

/** Batch fetch by AniList ids — avoids N+1 on grids of known ids. */
export async function fetchAnimeByIds(ids: number[]): Promise<Anime[]> {
  const unique = [...new Set(ids.filter((id) => id > 0 && id < KITSU_ID_OFFSET))];
  if (!unique.length) return [];
  const key = cacheKey(["byIds", unique.slice().sort((a, b) => a - b).join(",")]);
  return dedupedFetch(
    key,
    async () => {
      const query = `
        query ($ids: [Int]) {
          Page(page: 1, perPage: 50) {
            media(type: ANIME, id_in: $ids) {
              ${MEDIA_FIELDS}
            }
          }
        }
      `;
      const data = await anilistFetch<{
        Page: { media: Record<string, unknown>[] };
      }>(query, { ids: unique.slice(0, 50) });
      return (data.Page.media || []).map(mapAniListMedia);
    },
    CACHE_TTL.catalog,
  );
}

export async function fetchAnimeById(id: number): Promise<Anime | null> {
  if (id >= SHIKI_ID_OFFSET) {
    lastSource = "shikimori";
    return shikiById(id - SHIKI_ID_OFFSET);
  }
  if (id >= KITSU_ID_OFFSET) {
    lastSource = "kitsu";
    return kitsuById(id - KITSU_ID_OFFSET);
  }

  const key = cacheKey(["byId", id]);
  return dedupedFetch(
    key,
    () =>
      withFallbacks(
        "byId",
        async () => {
          const a = await anilistById(id);
          if (!a) throw new Error("AniList media not found");
          return a;
        },
        [
          {
            name: "Shikimori",
            run: async () => {
              const a = await shikiById(id);
              if (!a) throw new Error("Shikimori not found");
              return a;
            },
          },
          {
            name: "MAL",
            run: async () => {
              if (!isMalOfficialConfigured()) throw new Error("MAL not configured");
              const a = await malOfficialById(id);
              if (!a) throw new Error("MAL not found");
              return a;
            },
          },
          {
            name: "Kitsu",
            run: async () => {
              const a = await kitsuById(id);
              if (!a) throw new Error("Kitsu not found");
              return a;
            },
          },
          {
            name: "TMDB",
            run: async () => {
              if (!isTmdbConfigured()) throw new Error("TMDB not configured");
              const a = await tmdbAnimeById(id);
              if (!a) throw new Error("TMDB not found");
              return a;
            },
          },
          {
            name: "Static",
            run: async () => {
              const a = await staticByMalId(id);
              if (!a) throw new Error("Static not found");
              return a;
            },
          },
        ],
      ).catch(() => null),
    CACHE_TTL.catalog,
  );
}

async function anilistFiltered(
  filters: AnimeFilters,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  if (filters.search?.trim()) {
    return anilistSearch(filters.search.trim(), page, perPage);
  }

  const sort = SORT_MAP[filters.sort || "score"] || "SCORE_DESC";
  const isAdult =
    filters.adultFilter === "only"
      ? true
      : filters.adultFilter === "exclude"
        ? false
        : null;

  const query = `
    query (
      $page: Int
      $perPage: Int
      $sort: [MediaSort]
      $genre: String
      $tag: String
      $status: MediaStatus
      $format: MediaFormat
      $seasonYear: Int
      $isAdult: Boolean
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          type: ANIME
          sort: $sort
          genre: $genre
          tag: $tag
          status: $status
          format: $format
          seasonYear: $seasonYear
          isAdult: $isAdult
        ) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const variables: Record<string, unknown> = {
    page,
    perPage,
    sort: [sort],
  };
  if (filters.genre) variables.genre = filters.genre;
  if (filters.tag) variables.tag = filters.tag;
  if (filters.status) {
    const statusMap: Record<string, string> = {
      finished: "FINISHED",
      currently_airing: "RELEASING",
      not_yet_aired: "NOT_YET_RELEASED",
      cancelled: "CANCELLED",
      hiatus: "HIATUS",
      FINISHED: "FINISHED",
      RELEASING: "RELEASING",
    };
    variables.status = statusMap[filters.status] || filters.status;
  }
  if (filters.format) {
    variables.format = filters.format.toUpperCase().replace("-", "_");
  }
  if (filters.year != null) {
    const y = typeof filters.year === "number" ? filters.year : parseInt(String(filters.year), 10);
    if (Number.isFinite(y) && y > 0) variables.seasonYear = y;
  }
  if (isAdult !== null) variables.isAdult = isAdult;

  const data = await anilistFetch<{
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
      };
      media: Record<string, unknown>[];
    };
  }>(query, variables);

  return {
    data: (data.Page.media || []).map(mapAniListMedia),
    pagination: {
      total: data.Page.pageInfo.total ?? 0,
      currentPage: data.Page.pageInfo.currentPage,
      lastPage: data.Page.pageInfo.lastPage,
      hasNextPage: Boolean(data.Page.pageInfo.hasNextPage),
    },
  };
}

export async function fetchFiltered(
  filters: AnimeFilters,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const key = cacheKey([
    "filtered",
    filters.genre,
    filters.tag,
    filters.status,
    filters.format,
    filters.year,
    filters.sort,
    filters.search,
    filters.adultFilter,
    page,
    perPage,
  ]);
  // Tag filters are AniList-specific. Kitsu/Shikimori ignore `tag` and would
  // poison mood pools with identical untagged catalogues if used as fallbacks.
  const fallbacks = filters.tag
    ? []
    : catalogFallbacks("filtered", { filters, page, perPage });
  return dedupedFetch(
    key,
    () =>
      withFallbacks(
        "filtered",
        () => anilistFiltered(filters, page, perPage),
        fallbacks,
      ),
    CACHE_TTL.catalog,
  );
}
