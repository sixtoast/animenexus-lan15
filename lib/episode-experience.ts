/**
 * Episode experience helpers (Multi-API Sprint 9).
 */

import type { AnimeEpisode } from "./enrichment-types";

/** Label for watchlist progress — uses title when known. */
export function episodeProgressLabel(
  progress: number,
  episodes?: AnimeEpisode[],
): string {
  if (progress <= 0) return "Not started";
  const ep = episodes?.find((e) => e.number === progress);
  if (ep?.title?.trim()) {
    return `Ep ${progress} · ${ep.title}`;
  }
  return `Episode ${progress}`;
}

/** Estimate remaining runtime from episode count + duration. */
export function estimateRemainingMinutes(
  totalEpisodes: number,
  progress: number,
  durationMin: number,
): number {
  const left = Math.max(0, totalEpisodes - progress);
  return left * (durationMin || 24);
}

/**
 * Binge plan: how many full episodes fit in available minutes.
 * Transparent — no skip data until AniSkip (Sprint 13).
 */
export function episodesFitInMinutes(
  availableMin: number,
  durationMin: number,
): number {
  if (availableMin <= 0 || durationMin <= 0) return 0;
  return Math.floor(availableMin / durationMin);
}
