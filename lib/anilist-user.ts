/**
 * Public AniList user + MediaListCollection (no OAuth).
 */
import { ANILIST_ENDPOINT, mapAniListMedia } from "./anilist";
import type { WatchStatus } from "./types";
import { normalizeEntry } from "./watchlist-storage";
import type { WatchlistEntry } from "./types";

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
    init.next = { revalidate: 120 };
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

export type AniListUserProfile = {
  id: number;
  name: string;
  avatar?: string;
  bannerImage?: string;
  about?: string;
};

const STATUS_MAP: Record<string, WatchStatus> = {
  CURRENT: "watching",
  PLANNING: "planning",
  COMPLETED: "completed",
  PAUSED: "paused",
  DROPPED: "dropped",
  REPEATING: "watching",
};

export async function fetchUserByName(
  name: string,
): Promise<AniListUserProfile | null> {
  const query = `
    query ($name: String) {
      User(name: $name) {
        id
        name
        about
        avatar { large medium }
        bannerImage
      }
    }
  `;
  const data = await gql<{
    User: {
      id: number;
      name: string;
      about?: string;
      avatar?: { large?: string; medium?: string };
      bannerImage?: string;
    } | null;
  }>(query, { name });

  if (!data.User) return null;
  return {
    id: data.User.id,
    name: data.User.name,
    about: data.User.about || undefined,
    avatar: data.User.avatar?.large || data.User.avatar?.medium,
    bannerImage: data.User.bannerImage || undefined,
  };
}

export type SyncedListItem = WatchlistEntry & {
  anilistStatus?: string;
};

export async function fetchUserAnimeList(
  userName: string,
): Promise<SyncedListItem[]> {
  const query = `
    query ($userName: String) {
      MediaListCollection(userName: $userName, type: ANIME) {
        lists {
          name
          isCustomList
          entries {
            status
            progress
            score
            media {
              id
              title { romaji english native }
              coverImage { large medium }
              format
              startDate { year }
              episodes
              duration
              averageScore
              siteUrl
            }
          }
        }
      }
    }
  `;

  const data = await gql<{
    MediaListCollection: {
      lists: {
        name: string;
        isCustomList: boolean;
        entries: {
          status: string;
          progress: number;
          score: number;
          media: Record<string, unknown> | null;
        }[];
      }[];
    } | null;
  }>(query, { userName });

  if (!data.MediaListCollection) return [];

  const byId = new Map<number, SyncedListItem>();

  for (const list of data.MediaListCollection.lists || []) {
    for (const entry of list.entries || []) {
      if (!entry.media) continue;
      const anime = mapAniListMedia(entry.media);
      const watchStatus =
        STATUS_MAP[entry.status] ||
        (list.name.toLowerCase().includes("plan") ? "planning" : "watching");

      const existing = byId.get(anime.id);
      if (existing && list.isCustomList) continue;

      byId.set(
        anime.id,
        normalizeEntry({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          format: anime.format,
          year: anime.year,
          episodes: anime.episodes,
          duration: anime.duration,
          score: anime.score,
          watchStatus,
          progress: entry.progress || 0,
          userRating: entry.score || 0,
          notes: "",
        }) as SyncedListItem,
      );
    }
  }

  return Array.from(byId.values());
}
