/**
 * Unified themes enrichment (Multi-API Sprint 17).
 * Jikan = text OP/ED; AnimeThemes = video / page links via AniList → MAL → title.
 * Soft-fail only.
 */

import { fetchThemesFromJikan, youtubeSearchUrl } from "./jikan-themes";
import {
  fetchAnimeThemesByAniListId,
  fetchAnimeThemesByMalId,
  fetchAnimeThemesByTitle,
  type ThemeVideo,
} from "./providers/animethemes";
import type { AnimeTheme } from "./enrichment-types";

export type EnrichedThemeLine = {
  label: string;
  youtubeSearch: string;
  animethemesUrl?: string;
  videoUrl?: string;
  episodeRange?: string;
  source: string;
};

export type EnrichedThemes = {
  openings: EnrichedThemeLine[];
  endings: EnrichedThemeLine[];
  inserts: EnrichedThemeLine[];
  themes: AnimeTheme[];
  sourceNote: string;
  matchedBy?: string;
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

function lineFromTheme(t: AnimeTheme, episodeRange?: string): EnrichedThemeLine {
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
    episodeRange,
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
  if (!at && opts.idMal) {
    at = await fetchAnimeThemesByMalId(opts.idMal);
  }
  if (!at) {
    at = await fetchAnimeThemesByTitle(opts.title);
  }

  const themes: AnimeTheme[] = [];
  const notes: string[] = [];
  const rangeBySong = new Map<string, string>();

  if (at && (at.openings.length || at.endings.length || at.inserts.length)) {
    for (const t of [...at.openings, ...at.endings, ...at.inserts]) {
      themes.push(themeFromVideo(t));
      if (t.episodeRange) rangeBySong.set(t.song, t.episodeRange);
    }
    notes.push(`AnimeThemes (${at.matchedBy})`);
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
      if (!notes.some((n) => n.startsWith("Jikan"))) notes.push("Jikan / MAL");
    }
  }

  if (!themes.length) return null;

  const openings = themes
    .filter((t) => t.type === "OP")
    .slice(0, 12)
    .map((t) => lineFromTheme(t, rangeBySong.get(t.song)));
  const endings = themes
    .filter((t) => t.type === "ED")
    .slice(0, 12)
    .map((t) => lineFromTheme(t, rangeBySong.get(t.song)));
  const inserts = themes
    .filter((t) => t.type === "IN")
    .slice(0, 8)
    .map((t) => lineFromTheme(t, rangeBySong.get(t.song)));

  return {
    openings,
    endings,
    inserts,
    themes: themes.slice(0, 32),
    sourceNote: notes.join(" · ") || "catalog",
    matchedBy: at?.matchedBy,
  };
}
