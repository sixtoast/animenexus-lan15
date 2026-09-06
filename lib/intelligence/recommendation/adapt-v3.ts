/**
 * Adapt V3 ranked items to legacy RankedRecommendation shape for UI.
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import type { RankedRecommendation } from "@/lib/recommend-rank";
import {
  rankRecommendationsV3,
  type RankedRecommendationV3,
} from "./ranker-v3";

function mapConfidence(
  c: RankedRecommendationV3["confidence"],
): RankedRecommendation["confidence"] {
  switch (c) {
    case "very_strong":
    case "strong":
      return "strong";
    case "good":
      return "good";
    case "soft":
      return "soft";
    default:
      return "exploratory";
  }
}

export function rankedV3ToLegacy(
  list: RankedRecommendationV3[],
): RankedRecommendation[] {
  return list.map((r) => ({
    anime: r.anime,
    score: r.score,
    confidence: mapConfidence(r.confidence),
    resonanceSim: r.featureBreakdown.fingerprint ?? r.score,
    reasons: [
      ...r.strongSignals.slice(0, 2).map((s) => s.label),
      ...r.reasons,
    ].slice(0, 5),
  }));
}

export function rankRecommendationsV3AsLegacy(
  candidates: Anime[],
  entries: WatchlistEntry[],
  opts?: {
    excludeIds?: Set<number> | number[];
    experienceSlug?: string;
  },
): RankedRecommendation[] {
  const v3 = rankRecommendationsV3(candidates, entries, {
    excludeIds: opts?.excludeIds,
    experienceSlug: opts?.experienceSlug,
  });
  return rankedV3ToLegacy(v3);
}
