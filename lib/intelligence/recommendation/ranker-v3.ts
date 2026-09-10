/**
 * Ranker V3 — centralised weights over fingerprint features.
 * Additive; legacy recommend-rank.ts remains production default for lists.
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  buildAnimePreferenceFingerprint,
  buildEnrichedFingerprint,
  fingerprintToVector,
  type AnimePreferenceFingerprint,
} from "@/lib/intelligence/items";
import {
  vectorSimilarity,
  WEIGHTS_LONG_TERM,
  WEIGHTS_TONIGHT,
  topAlignedDimensions,
  humanizeDimKey,
} from "@/lib/intelligence/items/fingerprint-similarity";
import {
  blendUserVector,
  buildUserPreferenceVector,
} from "@/lib/intelligence/preference/user-preference-vector";
import {
  buildTasteClustersV3,
  clusterAffinityV3,
} from "@/lib/intelligence/taste/taste-clusters-v3";
import { detectTasteDriftV3 } from "@/lib/intelligence/taste/taste-drift-v3";
import { estimateCompletionLikelihood } from "./completion-likelihood";
import { detectFriction, type FrictionSignal } from "./friction";
import {
  inferNoveltyTolerance,
  explorationBudget,
} from "@/lib/intelligence/preference/novelty-tolerance";
import {
  buildFatigueProfile,
  fatigueForAnime,
  fatigueScoreFactor,
} from "@/lib/taste-fatigue";
import { buildDropSignatures, dropPenalty } from "@/lib/drop-signatures";
import {
  getExperienceIntent,
  fingerprintIntentFit,
} from "@/lib/viewing-intent";
import { readIntentSession } from "@/lib/intent-session";

export const RANKER_VERSION = "ranker_v3";

export const RANKER_V3_WEIGHTS = {
  stableTaste: 0.22,
  activeCluster: 0.14,
  emergingTaste: 0.11,
  viewingIntent: 0.15,
  fingerprint: 0.12,
  sourceAgreement: 0.06,
  completionLikelihood: 0.1,
  communityQuality: 0.05,
  availability: 0.03,
  fatigue: 0.08,
  dropRisk: 0.08,
} as const;

export const RANKER_V3_EXPLICIT_INTENT_WEIGHTS = {
  stableTaste: 0.13,
  activeCluster: 0.08,
  emergingTaste: 0.06,
  viewingIntent: 0.36,
  fingerprint: 0.09,
  sourceAgreement: 0.06,
  completionLikelihood: 0.1,
  communityQuality: 0.05,
  availability: 0.03,
  fatigue: 0.08,
  dropRisk: 0.08,
} as const;

export type MatchSignal = {
  key: string;
  label: string;
  strength: number;
};

export type RankedRecommendationV3 = {
  anime: Anime;
  score: number;
  confidence: "strong" | "good" | "soft" | "exploratory";
  reasons: string[];
  signals: MatchSignal[];
  friction: FrictionSignal[];
  completionLikelihood: number;
  noveltyFit: number;
  explorationSlot: boolean;
  featureBreakdown: AnimePreferenceFingerprint;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function confidenceLabel(score: number): RankedRecommendationV3["confidence"] {
  if (score >= 0.72) return "strong";
  if (score >= 0.55) return "good";
  if (score >= 0.35) return "soft";
  return "exploratory";
}

export function rankRecommendationsV3(
  candidates: Anime[],
  entries: WatchlistEntry[],
  opts?: {
    excludeIds?: Set<number> | number[];
    experienceSlug?: string | null;
    fingerprints?: Map<number, AnimePreferenceFingerprint>;
    sourceAgreement?: Map<number, number>;
  },
): RankedRecommendationV3[] {
  const exclude = new Set(
    opts?.excludeIds
      ? Array.isArray(opts.excludeIds)
        ? opts.excludeIds
        : [...opts.excludeIds]
      : [],
  );

  const user = buildUserPreferenceVector(entries);
  const userVec = blendUserVector(user);
  const clusters = buildTasteClustersV3(entries);
  const trends = detectTasteDriftV3(entries, {
    fingerprints: opts?.fingerprints,
  });
  const novelty = inferNoveltyTolerance(entries);
  const budget = explorationBudget(novelty);
  const fatigue = buildFatigueProfile(entries);
  const dropSigs = buildDropSignatures(entries, 2);

  let slug = opts?.experienceSlug ?? null;
  if (slug == null && typeof window !== "undefined") {
    try {
      slug = readIntentSession()?.slug ?? null;
    } catch {
      slug = null;
    }
  }
  const exp = slug ? getExperienceIntent(slug) : undefined;
  const session =
    typeof window !== "undefined" ? readIntentSession() : null;

  const emergingVec = { ...userVec };
  for (const t of trends.filter((x) => x.direction === "up").slice(0, 4)) {
    emergingVec[t.dimension] = Math.min(
      1,
      (emergingVec[t.dimension] ?? 0.5) + 0.15 * t.strength,
    );
  }

  const active = clusters.find((c) => c.state === "stable") || clusters[0];
  const W =
    exp && exp.slug !== "surprise"
      ? RANKER_V3_EXPLICIT_INTENT_WEIGHTS
      : RANKER_V3_WEIGHTS;
  const ranked: RankedRecommendationV3[] = [];

  for (const anime of candidates) {
    if (exclude.has(anime.id)) continue;

    let fp = opts?.fingerprints?.get(anime.id);
    if (!fp) fp = buildEnrichedFingerprint(anime);

    const stableSim = vectorSimilarity(user.stable, fp, WEIGHTS_LONG_TERM);
    const clusterSim = active
      ? clusterAffinityV3(fp, active)
      : vectorSimilarity(userVec, fp, WEIGHTS_LONG_TERM);
    const emergingSim = vectorSimilarity(emergingVec, fp, WEIGHTS_LONG_TERM);

    let intentSim = stableSim * 0.85;
    if (exp) {
      intentSim =
        exp.slug === "surprise"
          ? 0.5
          : fingerprintIntentFit(fp, exp, session);
    }

    const fpSim = vectorSimilarity(userVec, fp, WEIGHTS_LONG_TERM);
    const agreement = opts?.sourceAgreement?.get(anime.id) ?? 1;
    const agreementScore = clamp01((agreement - 1) / 3);

    const completion = estimateCompletionLikelihood(anime, entries, {
      userVector: userVec,
      fingerprint: fp,
    });

    const community =
      typeof anime.score === "number" && anime.score > 0
        ? clamp01((anime.score - 50) / 40)
        : 0.45;

    const fat = fatigueForAnime(anime, fatigue);
    const fatFactor = fatigueScoreFactor(fat);
    const fatiguePenalty = 1 - fatFactor;

    const { penalty: dropPen } = dropPenalty(anime, dropSigs);

    const availability = 0.55;

    let score =
      W.stableTaste * stableSim +
      W.activeCluster * clusterSim +
      W.emergingTaste * emergingSim +
      W.viewingIntent * intentSim +
      W.fingerprint * fpSim +
      W.sourceAgreement * agreementScore +
      W.completionLikelihood * completion +
      W.communityQuality * community +
      W.availability * availability -
      W.fatigue * fatiguePenalty -
      W.dropRisk * dropPen;

    score = clamp01(score);

    const reasons: string[] = [];
    if (exp && intentSim >= 0.55) {
      reasons.push(`Fits tonight \u00b7 ${exp.label}`);
    }
    if (stableSim >= 0.6) reasons.push("Aligned with long-term taste");
    if (clusterSim >= 0.62) reasons.push("Matches an active taste cluster");
    if (completion >= 0.65) reasons.push("Likely to finish");
    if (fatFactor < 0.85) reasons.push("Some fatigue risk on familiar beats");
    if (dropPen > 0.15) reasons.push("Shares traits with past drops");

    const aligned = topAlignedDimensions(userVec, fp, 3);
    const signals: MatchSignal[] = aligned.map((d) => ({
      key: d.key,
      label: humanizeDimKey(d.key),
      strength: d.score,
    }));

    const friction = detectFriction(anime, entries, {
      fingerprint: fp,
      userVector: userVec,
      fatiguePenalty,
      dropPenalty: dropPen,
    });

    const explorationSlot =
      novelty.level === "high" &&
      budget.explorationShare > 0.2 &&
      (fpSim < 0.45 || intentSim < 0.5);

    ranked.push({
      anime,
      score,
      confidence: confidenceLabel(score),
      reasons: reasons.slice(0, 5),
      signals,
      friction,
      completionLikelihood: completion,
      noveltyFit: clamp01(1 - Math.abs(novelty.score - 0.5) * 0.5),
      explorationSlot,
      featureBreakdown: fp,
    });
  }

  ranked.sort((a, b) => b.score - a.score);

  // Soft exploration interleave for high novelty tolerance
  if (budget.explorationShare >= 0.25 && ranked.length > 8) {
    const explorers = ranked.filter((r) => r.explorationSlot).slice(0, 3);
    if (explorers.length) {
      const core = ranked.filter((r) => !r.explorationSlot);
      const out: RankedRecommendationV3[] = [];
      let ei = 0;
      for (let i = 0; i < core.length; i++) {
        out.push(core[i]);
        if ((i + 1) % 5 === 0 && ei < explorers.length) {
          out.push(explorers[ei++]);
        }
      }
      while (ei < explorers.length) out.push(explorers[ei++]);
      return out;
    }
  }

  return ranked;
}
