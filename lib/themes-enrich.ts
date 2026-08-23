/**
 * Unified themes enrichment (Sprint 21 + Sprint 3 provenance).
 * Jikan = text OP/ED; AnimeThemes = optional video / page links.
 * Soft-fail only.
 */

import { fetchThemesFromJikan, youtubeSearchUrl } from "./jikan-themes";
import {
  fetchAnimeThemesByAniListId,
  fetchAnimeThemesByTitle,
  type ThemeVideo,
} from "./providers/animethemes";
import type { AnimeTheme } from "./enrichment-types";

export type EnrichedThemeLine = {
  label: string;
  youtubeSearch: string;
  animethemesUrl?: string;
  videoUrl?: string;
  /** provenance for UI */
  source: string;
};

export type EnrichedThemes = {
  openings: EnrichedThemeLine[];
  endings: EnrichedThemeLine[];
  /** Normalised list for services */
  themes: AnimeTheme[];
  sourceNote: string;
};

function themeFromVideo(t: ThemeVideo): AnimeTheme {
  const type = t.type.startsWith("ED")
    ? "ED"
    : t.type.startsWith("IN")
      ? "IN"
      : "OP";
  const seqMatch = t.slug.match(/(\d+)/);
  return {
    type,
    sequence: seqMatch ? parseInt(seqMatch[1], 10) : undefined,
    song: t.song,
    artist: t.artists.length ? t.artists.join(", ") : undefined,
    video: t.videoUrl,
    pageUrl: t.pageUrl,
    source: "animethemes",
  };
}

function themeFromString(label: string, kind: "OP" | "ED"): AnimeTheme {
  return {
    type: kind,
    song: label,
    source: "jikan",
  };
}

function lineFromTheme(t: AnimeTheme): EnrichedThemeLine {
  const label =
    t.sequence != null
      ? `${t.type}${t.sequence}: ${t.song}${t.artist ? ` — ${t.artist}` : ""}`
      : t.artist
        ? `${t.song} — ${t.artist}`
        : t.song;
  return {
    label,
    youtubeSearch: youtubeSearchUrl(
      `${t.song} ${t.artist || ""}`.trim(),
    ),
    animethemesUrl: t.pageUrl,
    videoUrl: t.video,
    source: t.source,
  };
}

export async function enrichThemes(opts: {
  anilistId: number;
  idMal?: number | null;
  title: string;
}): Promise<EnrichedThemes | null> {
  const [jikan, atById] = await Promise.all([
    opts.idMal ? fetchThemesFromJikan(opts.idMal) : Promise.resolve(null),
    fetchAnimeThemesByAniListId(opts.anilistId),
  ]);

  let at = atById;
  if (!at) {
    at = await fetchAnimeThemesByTitle(opts.title);
  }

  const themes: AnimeTheme[] = [];
  const notes: string[] = [];

  if (at && (at.openings.length || at.endings.length || at.inserts.length)) {
    for (const t of [...at.openings, ...at.endings, ...at.inserts]) {
      themes.push(themeFromVideo(t));
    }
    notes.push("AnimeThemes");
  }

  if (jikan) {
    const haveOp = themes.some((t) => t.type === "OP");
    const haveEd = themes.some((t) => t.type === "ED");
    if (!haveOp) {
      for (const s of jikan.openings) themes.push(themeFromString(s, "OP"));
    }
    if (!haveEd) {
      for (const s of jikan.endings) themes.push(themeFromString(s, "ED"));
    }
    if (jikan.openings.length || jikan.endings.length) {
      if (!notes.includes("Jikan / MAL")) notes.push("Jikan / MAL");
    }
  }

  if (!themes.length) return null;

  const openings = themes
    .filter((t) => t.type === "OP")
    .slice(0, 10)
    .map(lineFromTheme);
  const endings = themes
    .filter((t) => t.type === "ED")
    .slice(0, 10)
    .map(lineFromTheme);

  return {
    openings,
    endings,
    themes: themes.slice(0, 24),
    sourceNote: notes.join(" · ") || "catalog",
  };
}
