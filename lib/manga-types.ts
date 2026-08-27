/**
 * Manga domain (API Expansion II Sprint 27).
 * Separate from anime catalog — adapters feed this shape only.
 */

export type MangaStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS"
  | string;

export type MangaSummary = {
  id: number;
  title: string;
  titleRomaji?: string;
  titleNative?: string;
  description?: string;
  status?: MangaStatus;
  format?: string;
  chapters?: number | null;
  volumes?: number | null;
  year?: number | null;
  score?: number | null;
  image?: string;
  genres?: string[];
  source: "anilist" | "jikan" | "mal" | "unknown";
  anilistId?: number;
  malId?: number | null;
  url?: string;
};

export type MangaSourceLink = {
  relationType: string;
  manga: MangaSummary;
};
