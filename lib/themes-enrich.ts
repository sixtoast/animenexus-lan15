/**
 * Unified themes enrichment (Sprint 21).
 * Jikan = text OP/ED list; AnimeThemes = optional video / page links.
 * All soft-fail.
 */

import { fetchThemesFromJikan, youtubeSearchUrl } from "./jikan-themes";
import {
  fetchAnimeThemesByAniListId,
  fetchAnimeThemesByTitle,
  type ThemeVideo,
} from "./providers/animethemes";

export type EnrichedThemeLine = {
  label: string;
  youtubeSearch: string;
  animethemesUrl?: string;
  videoUrl?: string;
};

export type EnrichedThemes = {
  openings: EnrichedThemeLine[];
  endings: EnrichedThemeLine[];
  sourceNote: string;
};

function linesFromVideos(list: ThemeVideo[]): EnrichedThemeLine[] {
  return list.map((t) => {
    const artist = t.artists.length ? ` — ${t.artists.join(", ")}` : "";
    const label = `${t.slug}: ${t.song}${artist}`;
    return {
      label,
      youtubeSearch: youtubeSearchUrl(`${t.song} ${t.artists[0] || ""}`.trim()),
      animethemesUrl: t.pageUrl,
      videoUrl: t.videoUrl,
    };
  });
}

function linesFromStrings(list: string[]): EnrichedThemeLine[] {
  return list.map((label) => ({
    label,
    youtubeSearch: youtubeSearchUrl(label),
  }));
}

export async function enrichThemes(opts: {
  anilistId: number;
  idMal?: number | null;
  title: string;
}): Promise<EnrichedThemes | null> {
  const [jikan, atById, atByTitle] = await Promise.all([
    opts.idMal ? fetchThemesFromJikan(opts.idMal) : Promise.resolve(null),
    fetchAnimeThemesByAniListId(opts.anilistId),
    // only if AniList resource miss
    Promise.resolve(null as Awaited<ReturnType<typeof fetchAnimeThemesByTitle>>),
  ]);

  let at = atById;
  if (!at) {
    at = await fetchAnimeThemesByTitle(opts.title);
  }
  void atByTitle;

  const openings: EnrichedThemeLine[] = [];
  const endings: EnrichedThemeLine[] = [];
  const notes: string[] = [];

  if (at && (at.openings.length || at.endings.length)) {
    openings.push(...linesFromVideos(at.openings));
    endings.push(...linesFromVideos(at.endings));
    notes.push("AnimeThemes");
  } else if (jikan) {
    openings.push(...linesFromStrings(jikan.openings));
    endings.push(...linesFromStrings(jikan.endings));
    notes.push("Jikan / MAL");
  }

  // If AnimeThemes had videos but missing one side, fill from Jikan
  if (at && jikan) {
    if (!openings.length && jikan.openings.length) {
      openings.push(...linesFromStrings(jikan.openings));
    }
    if (!endings.length && jikan.endings.length) {
      endings.push(...linesFromStrings(jikan.endings));
    }
    if (!notes.includes("Jikan / MAL") && (jikan.openings.length || jikan.endings.length)) {
      notes.push("Jikan / MAL");
    }
  }

  if (!openings.length && !endings.length) return null;

  return {
    openings: openings.slice(0, 10),
    endings: endings.slice(0, 10),
    sourceNote: notes.join(" · ") || "catalog",
  };
}
