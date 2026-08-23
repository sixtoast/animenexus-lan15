/**
 * AnimeThemes.moe API — optional OP/ED video links (Sprint 21).
 * Soft-fail only. Never blocks detail page render.
 * Docs: https://api.animethemes.moe
 */

import { cacheKey, cachedFetch } from "../api-cache";

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
};

export type AnimeThemesResult = {
  openings: ThemeVideo[];
  endings: ThemeVideo[];
  inserts: ThemeVideo[];
};

type ApiTheme = {
  slug?: string;
  type?: string;
  song?: { title?: string; artists?: { name?: string }[] };
  animethemeentries?: {
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
    const init: RequestInit & { next?: { revalidate: number } } = {
      headers: { Accept: "application/json" },
    };
    if (typeof window === "undefined") {
      init.next = { revalidate: 86400 };
    }
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function mapTheme(t: ApiTheme, animeSlug?: string): ThemeVideo | null {
  const song = t.song?.title || t.slug || "Theme";
  const type = (t.type || "OP").toUpperCase();
  const artists =
    t.song?.artists?.map((a) => a.name).filter(Boolean) as string[] || [];
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
  };
}

/** Lookup by AniList id when available on AnimeThemes resource */
export async function fetchAnimeThemesByAniListId(
  anilistId: number,
): Promise<AnimeThemesResult | null> {
  if (!anilistId || anilistId < 1) return null;
  const key = cacheKey(["animethemes", "al", anilistId]);
  return cachedFetch(key, async () => {
    // Filter by external resource AniList id
    const url =
      `${BASE}/anime` +
      `?filter[has]=resources` +
      `&filter[site]=Anilist` +
      `&filter[external_id]=${anilistId}` +
      `&include=animethemes.animethemeentries.videos,animethemes.song.artists` +
      `&page[size]=1`;
    const json = (await getJson(url)) as {
      anime?: ApiAnime[];
    } | null;
    const anime = json?.anime?.[0];
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
    return { openings, endings, inserts };
  }, 86_400_000).catch(() => null);
}

/** Title search fallback when AniList resource link missing */
export async function fetchAnimeThemesByTitle(
  title: string,
): Promise<AnimeThemesResult | null> {
  const q = title.trim();
  if (q.length < 2) return null;
  const key = cacheKey(["animethemes", "q", q.toLowerCase()]);
  return cachedFetch(key, async () => {
    const url =
      `${BASE}/anime` +
      `?filter[name]=${encodeURIComponent(q)}` +
      `&include=animethemes.animethemeentries.videos,animethemes.song.artists` +
      `&page[size]=1`;
    const json = (await getJson(url)) as { anime?: ApiAnime[] } | null;
    const anime = json?.anime?.[0];
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
    return { openings, endings, inserts };
  }, 86_400_000).catch(() => null);
}
