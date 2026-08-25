/**
 * AnimeThemes.moe API — OP/ED/IN video links (Multi-API Sprint 17).
 * Soft-fail only. Never blocks detail page render.
 * Docs: https://api.animethemes.moe
 */

import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";

const BASE = "https://api.animethemes.moe";

export type ThemeVideo = {
  slug: string;
  type: "OP" | "ED" | "IN" | string;
  song: string;
  artists: string[];
  /** Link to animethemes.moe entry */
  pageUrl: string;
  /** Best-effort video URL if present */
  videoUrl?: string;
  episodeRange?: string;
  source: "animethemes";
};

export type AnimeThemesResult = {
  openings: ThemeVideo[];
  endings: ThemeVideo[];
  inserts: ThemeVideo[];
  animeSlug?: string;
  matchedBy: "anilist" | "mal" | "title";
};

type ApiTheme = {
  slug?: string;
  type?: string;
  sequence?: number;
  song?: { title?: string; artists?: { name?: string }[] };
  animethemeentries?: {
    episodes?: string;
    videos?: { link?: string; basename?: string }[];
  }[];
};

type ApiAnime = {
  name?: string;
  slug?: string;
  animethemes?: ApiTheme[];
};

async function getJson(url: string): Promise<unknown | null> {
  try {
    return await withProviderLimit("animethemes", async () => {
      const init: RequestInit & { next?: { revalidate: number } } = {
        headers: { Accept: "application/json" },
      };
      if (typeof window === "undefined") {
        init.next = { revalidate: 86400 };
      }
      const res = await fetch(url, init);
      if (!res.ok) return null;
      return res.json();
    });
  } catch {
    return null;
  }
}

function mapTheme(t: ApiTheme, animeSlug?: string): ThemeVideo | null {
  const song = t.song?.title || t.slug || "Theme";
  const type = (t.type || "OP").toUpperCase();
  const artists =
    (t.song?.artists?.map((a) => a.name).filter(Boolean) as string[]) || [];
  const entry = t.animethemeentries?.[0];
  const video =
    t.animethemeentries
      ?.flatMap((e) => e.videos || [])
      .find((v) => v.link)?.link || undefined;
  const slug = t.slug || type;
  return {
    slug,
    type,
    song,
    artists,
    pageUrl: animeSlug
      ? `https://animethemes.moe/anime/${animeSlug}/${slug}`
      : `https://animethemes.moe/?q=${encodeURIComponent(song)}`,
    videoUrl: video,
    episodeRange: entry?.episodes,
    source: "animethemes",
  };
}

function bucketThemes(
  anime: ApiAnime,
  matchedBy: AnimeThemesResult["matchedBy"],
): AnimeThemesResult | null {
  if (!anime?.animethemes?.length) return null;
  const openings: ThemeVideo[] = [];
  const endings: ThemeVideo[] = [];
  const inserts: ThemeVideo[] = [];
  for (const t of anime.animethemes) {
    const mapped = mapTheme(t, anime.slug);
    if (!mapped) continue;
    if (mapped.type.startsWith("ED")) endings.push(mapped);
    else if (mapped.type.startsWith("IN")) inserts.push(mapped);
    else openings.push(mapped);
  }
  if (!openings.length && !endings.length && !inserts.length) return null;
  return {
    openings,
    endings,
    inserts,
    animeSlug: anime.slug,
    matchedBy,
  };
}

export async function fetchAnimeThemesByAniListId(
  anilistId: number,
): Promise<AnimeThemesResult | null> {
  if (!anilistId || anilistId < 1) return null;
  const key = cacheKey(["animethemes", "al", anilistId]);
  return dedupedFetch(
    key,
    async () => {
      const url =
        `${BASE}/anime` +
        `?filter[has]=resources` +
        `&filter[site]=Anilist` +
        `&filter[external_id]=${anilistId}` +
        `&include=animethemes.animethemeentries.videos,animethemes.song.artists` +
        `&page[size]=1`;
      const json = (await getJson(url)) as { anime?: ApiAnime[] } | null;
      return bucketThemes(json?.anime?.[0] || {}, "anilist");
    },
    CACHE_TTL.long,
  ).catch(() => null);
}

export async function fetchAnimeThemesByMalId(
  malId: number,
): Promise<AnimeThemesResult | null> {
  if (!malId || malId < 1) return null;
  const key = cacheKey(["animethemes", "mal", malId]);
  return dedupedFetch(
    key,
    async () => {
      const url =
        `${BASE}/anime` +
        `?filter[has]=resources` +
        `&filter[site]=MyAnimeList` +
        `&filter[external_id]=${malId}` +
        `&include=animethemes.animethemeentries.videos,animethemes.song.artists` +
        `&page[size]=1`;
      const json = (await getJson(url)) as { anime?: ApiAnime[] } | null;
      return bucketThemes(json?.anime?.[0] || {}, "mal");
    },
    CACHE_TTL.long,
  ).catch(() => null);
}

export async function fetchAnimeThemesByTitle(
  title: string,
): Promise<AnimeThemesResult | null> {
  const q = title.trim();
  if (q.length < 2) return null;
  const key = cacheKey(["animethemes", "q", q.toLowerCase()]);
  return dedupedFetch(
    key,
    async () => {
      const url =
        `${BASE}/anime` +
        `?filter[name]=${encodeURIComponent(q)}` +
        `&include=animethemes.animethemeentries.videos,animethemes.song.artists` +
        `&page[size]=1`;
      const json = (await getJson(url)) as { anime?: ApiAnime[] } | null;
      return bucketThemes(json?.anime?.[0] || {}, "title");
    },
    CACHE_TTL.long,
  ).catch(() => null);
}
