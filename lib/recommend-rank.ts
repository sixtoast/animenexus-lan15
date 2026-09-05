/**
 * Recommendation ranking (V2).
 * Similarity is one signal among: clusters, session intent, drift, quality, fatigue, drops.
 */

import type { Anime, WatchlistEntry } from "./types";
import {
  buildPreferenceProfile,
  scoreCandidate,
} from "./preference-engine";
import { resonanceLabel, topResonanceDims, userResonance } from "./resonance";
import { deskNoteBoost } from "./desk-notes";
import { getCachedAvailability } from "./available-to-me";
import { readMyServices } from "./my-services";
import { buildFatigueProfile } from "./taste-fatigue";
import { rerankRecommendations, RERANKER_VERSION } from "./recommend-rerank";

export type RankedRecommendation = {
  anime: Anime;
  score: number;
  confidence: "strong" | "good" | "soft" | "exploratory";
  resonanceSim: number;
  reasons: string[];
};

function confidenceLabel(score: number): RankedRecommendation["confidence"] {
  if (score >= 0.72) return "strong";
  if (score >= 0.55) return "good";
  if (score >= 0.35) return "soft";
  return "exploratory";
}

export function confidenceCopy(
  c: RankedRecommendation["confidence"],
): string {
  switch (c) {
    case "strong":
      return "Very strong match";
    case "good":
      return "Solid match";
    case "soft":
      return "Soft match";
    default:
      return "Exploratory pick";
  }
}

export function rankRecommendations(
  candidates: Anime[],
  entries: WatchlistEntry[],
  opts?: {
    excludeIds?: Set<number> | number[];
    resonanceWeight?: number;
    experienceSlug?: string;
  },
): RankedRecommendation[] {
  const exclude = new Set(
    opts?.excludeIds
      ? Array.isArray(opts.excludeIds)
        ? opts.excludeIds
        : [...opts.excludeIds]
      : entries.map((e) => e.id),
  );

  const profile = buildPreferenceProfile(entries);
  const ranked: RankedRecommendation[] = [];

  for (const anime of candidates) {
    if (exclude.has(anime.id)) continue;

    const signals = scoreCandidate(anime, profile, {
      experienceSlug: opts?.experienceSlug,
    });

    let score = signals.score;
    if (opts?.resonanceWeight != null) {
      const rw = opts.resonanceWeight;
      score = signals.resonanceSim * rw + signals.score * (1 - rw * 0.5);
      score = Math.max(0, Math.min(1, score));
    }

    const reasons = [...signals.reasons];

    // Soft availability (client cache only — never hard-exclude)
    if (typeof window !== "undefined") {
      try {
        const prefs = readMyServices();
        if (prefs.services.length) {
          const region = (prefs.region || "US").toUpperCase().slice(0, 2);
          const cached = getCachedAvailability(anime.id, region);
          if (cached?.onMyServices) {
            score = Math.min(1, score + 0.06);
            if (reasons.length < 4) {
              reasons.push("Cached as available on a service you marked");
            }
          }
        }
      } catch {
        /* soft-fail */
      }
    }

    const note = deskNoteBoost(anime.id);
    if (note.boost > 0) {
      score = Math.min(1, score + note.boost);
      if (note.reason && reasons.length < 4) reasons.push(note.reason);
    }
    if (anime.score > 0 && reasons.length < 3) {
      const display =
        anime.score > 10 ? anime.score.toFixed(0) : anime.score.toFixed(1);
      reasons.push(`Community score around ${display}`);
    }
    if (!reasons.length) {
      reasons.push("Discoverable from the current signal desk");
    }

    ranked.push({
      anime,
      score,
      confidence: confidenceLabel(score),
      resonanceSim: signals.resonanceSim,
      reasons: reasons.slice(0, 4),
    });
  }

  ranked.sort((a, b) => b.score - a.score);

  // R5: diversity + fatigue + exploration budget
  const fatigue = buildFatigueProfile(entries);
  return rerankRecommendations(ranked, entries, {
    fatigue,
    limit: ranked.length,
    exploitationRatio: 0.75,
  });
}

export { RERANKER_VERSION };

export function whyThisIsHere(r: RankedRecommendation): string {
  const head = confidenceCopy(r.confidence);
  const body = r.reasons[0] || "Aligned with your current shelf.";
  return `${head}. ${body}`;
}

export function preferenceTrendLine(entries: WatchlistEntry[]): string | null {
  return buildPreferenceProfile(entries).trendLine;
}

export function preferenceClusterLabels(
  entries: WatchlistEntry[],
): string[] {
  return buildPreferenceProfile(entries).clusters.map((c) => c.label);
}

export function topUserResonanceLabels(entries: WatchlistEntry[], n = 3) {
  return topResonanceDims(userResonance(entries), n).map((d) =>
    resonanceLabel(d.dim),
  );
}
