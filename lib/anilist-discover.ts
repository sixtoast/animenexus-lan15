import { ANILIST_ENDPOINT, mapAniListMedia } from "./anilist";
import type { Anime, AnimePage } from "./types";
import type { AniSeason } from "./season";

type GqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function gql<T>(
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
    init.next = { revalidate: 600 };
  }
  const res = await fetch(ANILIST_ENDPOINT, init);
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = (await res.json()) as GqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("AniList returned empty data");
  return json.data;
}

const FIELDS = `
  id
  title { romaji english native }
  description
  genres
  status
  format
  startDate { year }
  season
  seasonYear
  averageScore
  popularity
  coverImage { large medium }
  bannerImage
  siteUrl
  episodes
  duration
  isAdult
`;

export async function fetchSeasonal(
  season: AniSeason,
  seasonYear: number,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const query = `
    query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          type: ANIME
          season: $season
          seasonYear: $seasonYear
          sort: [POPULARITY_DESC]
          isAdult: false
        ) {
          ${FIELDS}
        }
      }
    }
  `;
  const data = await gql<{
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
      };
      media: Record<string, unknown>[];
    };
  }>(query, { page, perPage, season, seasonYear });

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

export async function fetchAiring(
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          type: ANIME
          status: RELEASING
          sort: [POPULARITY_DESC]
          isAdult: false
        ) {
          ${FIELDS}
        }
      }
    }
  `;
  const data = await gql<{
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
      };
      media: Record<string, unknown>[];
    };
  }>(query, { page, perPage });

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

export async function fetchDailyPool(perPage = 50): Promise<Anime[]> {
  const query = `
    query ($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(
          type: ANIME
          sort: [POPULARITY_DESC]
          isAdult: false
          status_in: [FINISHED, RELEASING]
        ) {
          ${FIELDS}
        }
      }
    }
  `;
  const data = await gql<{
    Page: { media: Record<string, unknown>[] };
  }>(query, { perPage });
  return (data.Page.media || []).map(mapAniListMedia);
}

export async function fetchByGenres(
  genres: string[],
  opts: {
    page?: number;
    perPage?: number;
    sort?: string[];
    excludeIds?: number[];
  } = {},
): Promise<AnimePage> {
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 24;
  const sort = opts.sort ?? ["SCORE_DESC", "POPULARITY_DESC"];
  const genreFilter = genres.slice(0, 5);
  if (!genreFilter.length) {
    return {
      data: [],
      pagination: { total: 0, hasNextPage: false },
    };
  }
  const query = `
    query ($page: Int, $perPage: Int, $genres: [String], $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          type: ANIME
          genre_in: $genres
          sort: $sort
          isAdult: false
        ) {
          ${FIELDS}
        }
      }
    }
  `;
  const data = await gql<{
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
      };
      media: Record<string, unknown>[];
    };
  }>(query, { page, perPage, genres: genreFilter, sort });

  let list = (data.Page.media || []).map(mapAniListMedia);
  if (opts.excludeIds?.length) {
    const ban = new Set(opts.excludeIds);
    list = list.filter((a) => !ban.has(a.id));
  }
  return {
    data: list,
    pagination: {
      total: data.Page.pageInfo.total ?? 0,
      currentPage: data.Page.pageInfo.currentPage,
      lastPage: data.Page.pageInfo.lastPage,
      hasNextPage: Boolean(data.Page.pageInfo.hasNextPage),
    },
  };
}

export async function fetchAiringSchedule(
  hoursAhead = 48,
): Promise<
  {
    airingAt: number;
    episode: number;
    media: Anime;
  }[]
> {
  const now = Math.floor(Date.now() / 1000);
  const until = now + hoursAhead * 3600;
  const query = `
    query ($greater: Int, $lesser: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(
          airingAt_greater: $greater
          airingAt_lesser: $lesser
          sort: TIME
        ) {
          airingAt
          episode
          media {
            ${FIELDS}
          }
        }
      }
    }
  `;
  const data = await gql<{
    Page: {
      airingSchedules: {
        airingAt: number;
        episode: number;
        media: Record<string, unknown> | null;
      }[];
    };
  }>(query, { greater: now, lesser: until });

  return (data.Page.airingSchedules || [])
    .filter((row) => row.media)
    .map((row) => ({
      airingAt: row.airingAt,
      episode: row.episode,
      media: mapAniListMedia(row.media!),
    }));
}

export async function fetchUpcoming(
  opts: {
    page?: number;
    perPage?: number;
    genre?: string;
  } = {},
): Promise<AnimePage> {
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 24;
  const query = `
    query ($page: Int, $perPage: Int, $genre: String) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(
          type: ANIME
          status: NOT_YET_RELEASED
          sort: [POPULARITY_DESC]
          isAdult: false
          genre: $genre
        ) {
          ${FIELDS}
        }
      }
    }
  `;
  const variables: Record<string, unknown> = { page, perPage };
  if (opts.genre) variables.genre = opts.genre;
  const data = await gql<{
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
