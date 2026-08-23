/**
 * Provider registry surface (Multi-API Sprint 2).
 * Capability implementations land in later sprints; this file is the stable import path.
 */

export type {
  ProviderResult,
  ProviderError,
  ProviderMeta,
  CatalogueProvider,
  DetailProvider,
  ScheduleProvider,
  EpisodeProvider,
  ThemeProvider,
  SceneRecognitionProvider,
  VisualProvider,
  MusicProvider,
  ListProvider,
  VideoProvider,
  SkipProvider,
  AnimeEpisode,
  AnimeTheme,
  AnimeBroadcast,
  AnimeVisual,
  AnimeVideo,
  SceneMatch,
  MusicRecording,
  SkipInterval,
} from "./types";

export { KITSU_ID_OFFSET } from "./kitsu";
export { SHIKI_ID_OFFSET } from "./shikimori";

/** Known provider ids registered in the architecture */
export const PROVIDER_IDS = [
  "anilist",
  "kitsu",
  "shikimori",
  "jikan",
  "mal",
  "animethemes",
  "trace.moe",
  "animeschedule",
  "aniskip",
  "tmdb",
  "musicbrainz",
  "youtube",
  "wikidata",
] as const;

export type RegisteredProviderId = (typeof PROVIDER_IDS)[number];
