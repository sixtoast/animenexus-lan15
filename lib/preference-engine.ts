/**
 * Preference Engine V2 — blends long-term clusters, drift, session intent,
 * Viewing Intent, and completion-weighted outcomes into ranking signals.
 */

import type { Anime, WatchlistEntry } from "./types";
import { sessionEvents, affinityForAnime } from "./behaviour-events";
import { outcomeBoost } from "./outcome-events";
import {
  buildTasteClusters,
  clusterAffinity,
  type TasteCluster,
} from "./taste-clusters";
import {
  detectTasteTrends,
  trendSummary,
  type TasteTrend,
} from "./taste-drift";
import {
  animeIntentFingerprint,
  blendIntent,
  emptyIntent,
  getExperienceIntent,
  intentSimilarity,
  resolveIntentSlug,
  type IntentVector,
} from "./viewing-intent";
import {
  cosineSimilarity,
  resonanceFromGenres,
  userResonance,
  type ResonanceVector,
} from "./resonance";

export type PreferenceProfile = {
  clusters: TasteCluster[];
  trends: TasteTrend[];
  trendLine: string | null;
  sessionIntent: IntentVector;
  userResonance: ResonanceVector;
};

export function buildPreferenceProfile(
  entries: WatchlistEntry[],
): PreferenceProfile {
  const clusters = buildTasteClusters(entries);
  const trends = detectTasteTrends(entries);
  const sessionIntent = inferSessionIntent(entries);
  return {
    clusters,
    trends,
    trendLine: trendSummary(trends),
    sessionIntent,
    userResonance: userResonance(entries),
  };
}

function inferSessionIntent(entries: WatchlistEntry[]): IntentVector {
  let v = emptyIntent();
  const evs = sessionEvents().filter((e) => e.weight > 0);
  if (!evs.length) return v;

  let n = 0;
  for (const e of evs) {
    if (!e.animeId) continue;
    const entry = entries.find((x) => x.id === e.animeId);
    if (!entry) continue;
    const fp = animeIntentFingerprint(entry.genres || entry.tags);
    const w = Math.min(1, Math.abs(e.weight) / 5);
    v = blendIntent(v, fp, w);
    n += 1;
  }
  if (n === 0) return emptyIntent();
  return v;
}

export type RankSignals = {
  score: number;
  clusterScore: number;
  intentScore: number;
  resonanceSim: number;
  affinity: number;
  reasons: string[];
  activeCluster?: string;
};

export function scoreCandidate(
  anime: Anime,
  profile: PreferenceProfile,
  opts?: {
    experienceSlug?: string;
    exposedRecently?: boolean;
  },
): RankSignals {
  const tags = anime.tags || [];
  const ca = clusterAffinity(profile.clusters, tags);
  const animeRes = resonanceFromGenres(tags);
  const sim = cosineSimilarity(profile.userResonance, animeRes);

  let target = profile.sessionIntent;
  if (opts?.experienceSlug) {
    const exp = getExperienceIntent(resolveIntentSlug(opts.experienceSlug));
    if (exp?.target) {
      target = blendIntent(target, exp.target, 0.7);
    }
  }
  const animeIntent = animeIntentFingerprint(tags);
  const intentScore = intentSimilarity(target, animeIntent);

  const affinity = anime.id ? Math.tanh(affinityForAnime(anime.id) / 8) : 0;
  const outcomes = anime.id ? outcomeBoost(anime.id) : 0;

  const community =
    anime.score > 0
      ? anime.score > 10
        ? anime.score / 100
        : anime.score / 10
      : 0.45;

  let trendBoost = 0;
  const reasons: string[] = [];
  for (const t of profile.trends.slice(0, 4)) {
    if (
      t.direction === "up" &&
      tags.some((g) => String(g).toLowerCase() === t.dimension)
    ) {
      trendBoost += 0.08 * t.strength * t.confidence;
      if (reasons.length < 2) {
        reasons.push(`Matches your recent lean into ${t.dimension}`);
      }
    }
  }

  let score =
    ca.score * 0.26 +
    sim * 0.2 +
    intentScore * 0.2 +
    community * 0.16 +
    Math.max(0, affinity) * 0.05 +
    Math.max(0, outcomes) * 0.08 +
    trendBoost;

  if (opts?.exposedRecently) score -= 0.08;

  if (ca.score > 0.7 && profile.clusters[0]?.id === ca.clusterId) {
    const topShare = profile.clusters[0]?.weight ?? 0;
    if (topShare > 0.55) score -= 0.04;
  }

  if (ca.label && ca.score > 0.35) {
    reasons.unshift(`Fits your “${ca.label}” interest mode`);
  }
  if (intentScore > 0.7) {
    reasons.push("Aligned with what this session seems to want");
  }
  if (sim > 0.55) {
    reasons.push("Resonance overlap with your shelf");
  }
  if (outcomes > 0.35) {
    reasons.push("Prior outcomes with similar titles went somewhere");
  }
  if (profile.trendLine && reasons.length < 3) {
    reasons.push(profile.trendLine);
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    clusterScore: ca.score,
    intentScore,
    resonanceSim: sim,
    affinity,
    reasons: reasons.slice(0, 4),
    activeCluster: ca.label,
  };
}
