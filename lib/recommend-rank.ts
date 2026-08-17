/**
 * Recommendation ranking & explanation (Sprint 4).
 * Client-side: combines community score with resonance cosine similarity.
 * Does not invent precision like 93.271% — uses coarse confidence labels.
 */

import type { Anime, WatchlistEntry } from "./types";
import {
  cosineSimilarity,
  resonanceFromGenres,
  topResonanceDims,
  userResonance,
  resonanceLabel,
  type ResonanceVector,
} from "./resonance";

export type RankedRecommendation = {
  anime: Anime;
  /** 0–1 blended score used for ordering */
  score: number;
  /** Coarse match strength for UI */
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

function communityNorm(score: number | undefined | null): number {
  if (score == null || score <= 0) return 0.45;
  // AniList-style ~0–100 or 0–10
  const s = score > 10 ? score / 100 : score / 10;
  return Math.max(0, Math.min(1, s));
}

/** Shared top dimensions between user and anime vectors. */
function sharedDimReasons(
  user: ResonanceVector,
  anime: ResonanceVector,
  limit = 3,
): string[] {
  const pairs = topResonanceDims(user, 8)
    .map(({ dim, value }) => ({
      dim,
      value,
      both: Math.min(value, anime[dim]),
    }))
    .filter((p) => p.both > 0.2 && anime[p.dim] > 0.15)
    .sort((a, b) => b.both - a.both)
    .slice(0, limit);

  return pairs.map(
    (p) =>
      `Shares ${resonanceLabel(p.dim).toLowerCase()} with your shelf signal`,
  );
}

export function rankRecommendations(
  candidates: Anime[],
  entries: WatchlistEntry[],
  opts?: {
    excludeIds?: Set<number> | number[];
    /** Weight on resonance vs community score (default 0.65 resonance). */
    resonanceWeight?: number;
  },
): RankedRecommendation[] {
  const exclude = new Set(
    opts?.excludeIds
      ? Array.isArray(opts.excludeIds)
        ? opts.excludeIds
        : [...opts.excludeIds]
      : entries.map((e) => e.id),
  );
  const rw = opts?.resonanceWeight ?? 0.65;
  const cw = 1 - rw;
  const user = userResonance(entries);

  const ranked: RankedRecommendation[] = [];

  for (const anime of candidates) {
    if (exclude.has(anime.id)) continue;
    const animeVec = resonanceFromGenres(anime.genres || anime.tags);
    const sim = cosineSimilarity(user, animeVec);
    const community = communityNorm(anime.score);
    const score = sim * rw + community * cw;

    const reasons: string[] = [];
    reasons.push(...sharedDimReasons(user, animeVec));
    if (anime.score && anime.score > 0) {
      const display =
        anime.score > 10
          ? anime.score.toFixed(0)
          : anime.score.toFixed(1);
      reasons.push(`Community score around ${display}`);
    }
    if (anime.genres?.length) {
      const g = anime.genres.slice(0, 2).join(" / ");
      reasons.push(`Catalog genres: ${g}`);
    }
    if (!reasons.length) {
      reasons.push("Discoverable from the current signal desk");
    }

    ranked.push({
      anime,
      score,
      confidence: confidenceLabel(score),
      resonanceSim: sim,
      reasons: reasons.slice(0, 4),
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/** Short “Why this is here” block for one title. */
export function whyThisIsHere(r: RankedRecommendation): string {
  const head = confidenceCopy(r.confidence);
  const body = r.reasons[0] || "Aligned with your current shelf.";
  return `${head}. ${body}`;
}
