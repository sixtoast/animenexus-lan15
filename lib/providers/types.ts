/**
 * Provider capability contracts (Multi-API Sprint 2).
 * Providers implement only the capabilities they support.
 * UI must not call providers directly long-term — use experience services.
 */

import type { Anime, AnimeFilters, AnimePage, DiscoverFeed } from "../types";
import type { AnimeIdentity, IdentityProvider } from "../anime-identity";

/** Common envelope — every normalised result carries provenance */
export type ProviderResult<T> = {
  data: T;
  provider: IdentityProvider | string;
  /** Optional human label for UI transparency */
  providerLabel?: string;
  fetchedAt: string;
  /** true when served from cache */
  cacheHit?: boolean;
};

export type ProviderError = {
  provider: IdentityProvider | string;
  operation: string;
  message: string;
  retryable?: boolean;
  statusCode?: number;
};

export type ProviderMeta = {
  id: IdentityProvider | string;
  label: string;
  /** tier from architecture docs */
  tier: 1 | 2 | 3 | 4 | 5;
  optional: boolean;
};

// ── Capability interfaces ─────────────────────────────────────

export type CatalogueProvider = {
  meta: ProviderMeta;
  discover?: (
    feed: DiscoverFeed,
    page?: number,
    perPage?: number,
  ) => Promise<ProviderResult<AnimePage>>;
  search?: (
    query: string,
    page?: number,
    perPage?: number,
  ) => Promise<ProviderResult<AnimePage>>;
  filtered?: (
    filters: AnimeFilters,
    page?: number,
    perPage?: number,
  ) => Promise<ProviderResult<AnimePage>>;
  byId?: (id: number) => Promise<ProviderResult<Anime | null>>;
};

export type DetailProvider = {
  meta: ProviderMeta;
  detail: (anilistId: number) => Promise<ProviderResult<Anime | null>>;
};

export type ScheduleProvider = {
  meta: ProviderMeta;
  nextEpisode?: (
    identity: AnimeIdentity,
  ) => Promise<ProviderResult<AnimeBroadcast | null>>;
  schedule?: (
    identity: AnimeIdentity,
  ) => Promise<ProviderResult<AnimeBroadcast[]>>;
};

export type EpisodeProvider = {
  meta: ProviderMeta;
  episodes: (
    identity: AnimeIdentity,
  ) => Promise<ProviderResult<AnimeEpisode[]>>;
};

export type ThemeProvider = {
  meta: ProviderMeta;
  themes: (identity: AnimeIdentity) => Promise<ProviderResult<AnimeTheme[]>>;
};

export type SceneRecognitionProvider = {
  meta: ProviderMeta;
  identify: (
    image: Blob | ArrayBuffer | string,
  ) => Promise<ProviderResult<SceneMatch[]>>;
};

export type VisualProvider = {
  meta: ProviderMeta;
  visuals: (identity: AnimeIdentity) => Promise<ProviderResult<AnimeVisual[]>>;
};

export type MusicProvider = {
  meta: ProviderMeta;
  recording?: (
    query: { title: string; artist?: string },
  ) => Promise<ProviderResult<MusicRecording | null>>;
};

export type ListProvider = {
  meta: ProviderMeta;
  /** Public or OAuth-backed list import */
  fetchList: (
    handle: string,
  ) => Promise<ProviderResult<import("../types").WatchlistEntry[]>>;
};

export type VideoProvider = {
  meta: ProviderMeta;
  videos: (identity: AnimeIdentity) => Promise<ProviderResult<AnimeVideo[]>>;
};

export type SkipProvider = {
  meta: ProviderMeta;
  skipTimes: (
    identity: AnimeIdentity,
    episode: number,
  ) => Promise<ProviderResult<SkipInterval[]>>;
};

// ── Normalised enrichment shapes (Sprint 3 will own full docs) ─

export type AnimeEpisode = {
  number: number;
  title?: string;
  airedAt?: string;
  duration?: number;
  synopsis?: string;
  thumbnail?: string;
  source: string;
};

export type AnimeTheme = {
  type: "OP" | "ED" | "IN" | string;
  sequence?: number;
  song: string;
  artist?: string;
  video?: string;
  audio?: string;
  pageUrl?: string;
  source: string;
};

export type AnimeBroadcast = {
  episode?: number;
  rawAt?: string;
  subAt?: string;
  dubAt?: string;
  streamingServices?: string[];
  delayed?: boolean;
  source: string;
};

export type AnimeVisual = {
  type: "poster" | "backdrop" | "logo" | "still" | string;
  url: string;
  width?: number;
  height?: number;
  language?: string;
  provider: string;
};

export type AnimeVideo = {
  type: "trailer" | "pv" | "interview" | string;
  site: "youtube" | string;
  key: string;
  name?: string;
  official?: boolean;
  source: string;
};

export type SceneMatch = {
  anilistId: number | null;
  episode?: number | string | null;
  from: number;
  to: number;
  similarity: number;
  filename?: string;
  image?: string;
  video?: string;
  source: string;
};

export type MusicRecording = {
  title: string;
  artist?: string;
  mbid?: string;
  source: string;
};

export type SkipInterval = {
  type: "op" | "ed" | "recap" | "mixed" | string;
  start: number;
  end: number;
  source: string;
};
