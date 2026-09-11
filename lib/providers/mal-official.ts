/**
 * Official MyAnimeList API v2 — catalog reads with X-MAL-CLIENT-ID.
 * Requires MAL_CLIENT_ID (same app as OAuth). No user token needed for public catalog.
 * Docs: https://myanimelist.net/apiconfig/references/api/v2
 *
 * Must NOT import mal-oauth — that pulls next/headers and breaks client bundles
 * (anilist is imported from AIPanel and other client components).
 */

import type { Anime, AnimeFilters, AnimePage, DiscoverFeed } from "../types";
import { withProviderLimit } from "../provider-rate-limit";

export const MAL_OFFICIAL_ID_OFFSET = 30_000_000;

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function clientId(): string {
  return cleanEnv(process.env.MAL_CLIENT_ID);
}

export function isMalOfficialConfigured(): boolean {
  return Boolean(clientId());
}

type MalNode = {
  id: number;
  title?: string;
  main_picture?: { medium?: string; large?: string };
  alternative_titles?: { en?: string; ja?: string };
  start_date?: string;
  synopsis?: string;
  mean?: number;
  rank?: number;
  popularity?: number;
  num_episodes?: number;
  media_type?: string;
  status?: string;
  genres?: { id: number; name: string }[];
  average_episode_duration?: number;
};

function mapMal(node: MalNode): Anime {
  const genres = (node.genres || []).map((g) => g.name);
  const year = node.start_date ? parseInt(node.start_date.slice(0, 4), 10) : 0;
  const statusMap: Record<string, Anime["status"]> = {
    finished_airing: "FINISHED",
    currently_airing: "RELEASING",
    not_yet_aired: "NOT_YET_RELEASED",
  };
  const formatMap: Record<string, Anime["format"]> = {
    tv: "TV",
    movie: "MOVIE",
    ova: "OVA",
    ona: "ONA",
    special: "SPECIAL",
    music: "MUSIC",
  };
  const mt = (node.media_type || "tv").toLowerCase();
  return {
    id: node.id + MAL_OFFICIAL_ID_OFFSET,
    idMal: node.id,
    anilist_id: 0,
    title: node.title || node.alternative_titles?.en || "Unknown",
    titleRomaji: node.title,
    titleNative: node.alternative_titles?.ja || undefined,
    image: node.main_picture?.large || node.main_picture?.medium || "",
    description: node.synopsis || "",
    episodes: node.num_episodes ?? 0,
    duration: Math.round((node.average_episode_duration || 0) / 60) || 0,
    popularity: node.popularity ?? 0,
    score: node.mean != null ? Math.round(node.mean * 10) : 0,
    format: formatMap[mt] || "TV",
    status: statusMap[node.status || ""] || "FINISHED",
    year: Number.isFinite(year) ? year : "",
    genre: genres[0] || "N/A",
    tags: genres,
    source: "mal-official",
  } as Anime;
}

async function malGet(
  path: string,
  query: Record<string, string | number> = {},
): Promise<unknown> {
  const id = clientId();
  if (!id) throw new Error("MAL_CLIENT_ID not configured");
  return withProviderLimit("mal", async () => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
    const url = `https://api.myanimelist.net/v2${path}?${q}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-MAL-CLIENT-ID": id,
      },
      next: { revalidate: 300 },
    } as RequestInit);
    if (!res.ok) throw new Error(`MAL HTTP ${res.status}`);
    return res.json();
  });
}

const FIELDS =
  "id,title,main_picture,alternative_titles,start_date,synopsis,mean,rank,popularity,num_episodes,media_type,status,genres,average_episode_duration";

export async function malOfficialSearch(
  search: string,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const offset = Math.max(0, (page - 1) * perPage);
  const json = (await malGet("/anime", {
    q: search.slice(0, 64) || "a",
    limit: Math.min(perPage, 100),
    offset,
    fields: FIELDS,
  })) as { data?: { node: MalNode }[]; paging?: { next?: string } };
  const data = (json.data || []).map((row) => mapMal(row.node));
  return {
    data,
    pagination: {
      total: data.length + offset + (json.paging?.next ? perPage : 0),
      currentPage: page,
      lastPage: json.paging?.next ? page + 1 : page,
      hasNextPage: Boolean(json.paging?.next),
    },
  };
}

export async function malOfficialDiscover(
  feed: DiscoverFeed,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  const rankingType =
    feed === "top" ? "all" : "bypopularity";
  const offset = Math.max(0, (page - 1) * perPage);
  const json = (await malGet("/anime/ranking", {
    ranking_type: rankingType,
    limit: Math.min(perPage, 100),
    offset,
    fields: FIELDS,
  })) as { data?: { node: MalNode }[]; paging?: { next?: string } };
  const data = (json.data || []).map((row) => mapMal(row.node));
  return {
    data,
    pagination: {
      total: data.length + offset + (json.paging?.next ? perPage : 0),
      currentPage: page,
      lastPage: json.paging?.next ? page + 1 : page,
      hasNextPage: Boolean(json.paging?.next),
    },
  };
}

export async function malOfficialById(nativeId: number): Promise<Anime | null> {
  try {
    const json = (await malGet(`/anime/${nativeId}`, {
      fields: FIELDS,
    })) as MalNode;
    if (!json?.id) return null;
    return mapMal(json);
  } catch {
    return null;
  }
}

export async function malOfficialFiltered(
  filters: AnimeFilters,
  page = 1,
  perPage = 24,
): Promise<AnimePage> {
  if (filters.search?.trim()) {
    return malOfficialSearch(filters.search.trim(), page, perPage);
  }
  return malOfficialDiscover(
    filters.sort === "score" ? "top" : "popular",
    page,
    perPage,
  );
}
