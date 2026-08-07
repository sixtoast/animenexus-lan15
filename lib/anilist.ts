import type { Anime, AnimeFilters, AnimePage, DiscoverFeed } from "./types";

export const ANILIST_ENDPOINT = "https://graphql.anilist.co";

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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
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
    tags: genres,
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
  };
}

type GqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function anilistFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
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

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  description
  genres
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

export async function fetchDiscover(
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

export async function searchAnime(
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

export async function fetchAnimeById(id: number): Promise<Anime | null> {
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

export async function fetchFiltered(
  filters: AnimeFilters,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  if (filters.search?.trim()) {
    return searchAnime(filters.search.trim(), page, perPage);
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
  if (filters.year) variables.seasonYear = parseInt(filters.year, 10);
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
