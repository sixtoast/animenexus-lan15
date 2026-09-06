/**
 * Per-title "Your Match" — signals + friction, no fake precision %.
 */

import type { Anime, WatchlistEntry } from "./types";
import {
  buildPreferenceProfile,
  scoreCandidate,
} from "./preference-engine";
import {
  confidenceCopy,
  type RankedRecommendation,
} from "./recommend-rank";
import { readIntentSession } from "./intent-session";
import {
  rankRecommendationsV3,
  confidenceLabelV3,
  type MatchSignal,
  type RankedRecommendationV3,
} from "./intelligence/recommendation/ranker-v3";
import type { FrictionSignal } from "./intelligence/recommendation/friction";

export type YourMatch = {
  /** Internal 0–1 score — do not display as percentage */
  score: number;
  confidence:
    | RankedRecommendation["confidence"]
    | RankedRecommendationV3["confidence"];
  confidenceLabel: string;
  reasons: string[];
  activeCluster: string | null;
  onShelf: boolean;
  shelfStatus?: string;
  strongSignals?: MatchSignal[];
  frictionSignals?: FrictionSignal[];
  explorationLevel?: RankedRecommendationV3["explorationLevel"];
};

function confidenceFromScore(
  score: number,
): RankedRecommendation["confidence"] {
  if (score >= 0.72) return "strong";
  if (score >= 0.55) return "good";
  if (score >= 0.35) return "soft";
  return "exploratory";
}

export function computeYourMatch(
  anime: Anime,
  entries: WatchlistEntry[],
): YourMatch | null {
  if (entries.length < 2) return null;

  const onShelf = entries.find((e) => e.id === anime.id);

  try {
    const v3 = rankRecommendationsV3([anime], entries, {
      excludeIds: [],
    });
    const hit = v3[0];
    if (hit) {
      const reasons = [...hit.reasons];
      if (onShelf && reasons.length < 4) {
        reasons.unshift(
          onShelf.watchStatus === "completed"
            ? "Already on your completed shelf"
            : onShelf.watchStatus === "watching"
              ? "You're watching this now"
              : `On your list · ${onShelf.watchStatus}`,
        );
      }
      return {
        score: hit.score,
        confidence: hit.confidence,
        confidenceLabel: confidenceLabelV3(hit.confidence),
        reasons: reasons.slice(0, 5),
        activeCluster:
          hit.strongSignals.find((s) => s.key === "cluster")?.label ?? null,
        onShelf: !!onShelf,
        shelfStatus: onShelf?.watchStatus,
        strongSignals: hit.strongSignals,
        frictionSignals: hit.frictionSignals,
        explorationLevel: hit.explorationLevel,
      };
    }
  } catch {
    /* fall back to V2 */
  }

  const profile = buildPreferenceProfile(entries);
  let experienceSlug: string | undefined;
  try {
    experienceSlug = readIntentSession()?.slug || undefined;
  } catch {
    /* */
  }

  const signals = scoreCandidate(anime, profile, { experienceSlug });
  const conf = confidenceFromScore(signals.score);
  const reasons = [...signals.reasons];

  if (onShelf && reasons.length < 4) {
    reasons.unshift(
      onShelf.watchStatus === "completed"
        ? "Already on your completed shelf"
        : onShelf.watchStatus === "watching"
          ? "You're watching this now"
          : `On your list · ${onShelf.watchStatus}`,
    );
  }

  if (reasons.length < 3) {
    const genreHits = new Map<string, number>();
    for (const e of entries) {
      for (const g of e.genres || e.tags || []) {
        const k = String(g);
        genreHits.set(k, (genreHits.get(k) || 0) + 1);
      }
    }
    const top = [...genreHits.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([g]) => g.toLowerCase());
    const animeG = [
      anime.genre,
      ...(anime.tags || []),
      ...((anime as { genres?: string[] }).genres || []),
    ]
      .filter(Boolean)
      .map((g) => String(g).toLowerCase());
    const overlap = top.filter((g) =>
      animeG.some((a) => a === g || a.includes(g) || g.includes(a)),
    );
    if (overlap[0]) {
      reasons.push(
        `Shares "${overlap[0]}" with titles you already care about`,
      );
    }
  }

  return {
    score: signals.score,
    confidence: conf,
    confidenceLabel: confidenceCopy(conf),
    reasons: reasons.slice(0, 4),
    activeCluster: signals.activeCluster || null,
    onShelf: !!onShelf,
    shelfStatus: onShelf?.watchStatus,
  };
}
