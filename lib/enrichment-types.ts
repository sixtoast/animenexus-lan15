/**
 * Unified enrichment result types (Multi-API Sprint 3).
 * Every object retains provenance so UI/debug can show where data came from.
 *
 * Re-exported from provider capability module for a single domain import path.
 */

export type {
  AnimeEpisode,
  AnimeTheme,
  AnimeBroadcast,
  AnimeVisual,
  AnimeVideo,
  SceneMatch,
  MusicRecording,
  SkipInterval,
  ProviderResult,
  ProviderError,
} from "./providers/types";

import type {
  AnimeEpisode,
  AnimeTheme,
  AnimeBroadcast,
  AnimeVisual,
  AnimeVideo,
  SceneMatch,
  SkipInterval,
} from "./providers/types";

/** Aggregate bag returned by experience services (Sprint 27 target). */
export type AnimeEnrichmentBundle = {
  episodes?: AnimeEpisode[];
  themes?: AnimeTheme[];
  schedule?: AnimeBroadcast[];
  visuals?: AnimeVisual[];
  videos?: AnimeVideo[];
  sceneMatches?: SceneMatch[];
  skip?: SkipInterval[];
  /** provider → error message; partial failure only */
  errors?: Record<string, string>;
  provenance: string[];
};

export function emptyEnrichment(): AnimeEnrichmentBundle {
  return { provenance: [], errors: {} };
}

export function mergeProvenance(
  bundle: AnimeEnrichmentBundle,
  source: string,
): void {
  if (!bundle.provenance.includes(source)) {
    bundle.provenance.push(source);
  }
}
