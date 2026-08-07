/**
 * Placeholder for AniList / Jikan API clients.
 * Extract GraphQL and REST helpers from the SPA as you migrate features.
 */

export type AnimeSummary = {
  id: number;
  title: string;
  coverImage?: string;
  score?: number;
  genres?: string[];
  format?: string;
  year?: number;
};

export const ANILIST_ENDPOINT = "https://graphql.anilist.co";
export const JIKAN_BASE = "https://api.jikan.moe/v4";

/** Example AniList media query skeleton — expand when porting fetchAnime. */
export const MEDIA_QUERY = `
  query ($page: Int, $perPage: Int, $sort: [MediaSort], $genre: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(type: ANIME, sort: $sort, genre: $genre) {
        id
        title { romaji english native }
        coverImage { large medium }
        averageScore
        genres
        format
        seasonYear
      }
    }
  }
`;
