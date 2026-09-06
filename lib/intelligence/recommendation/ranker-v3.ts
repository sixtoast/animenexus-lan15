/**
 * Ranker V3 — centralised weights over fingerprint features.
 * Additive; legacy recommend-rank.ts remains production default for lists.
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  buildAnimePreferenceFingerprint,
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
import { getExperienceIntent } from "@/lib/viewing-intent";
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

export type MatchSignal = {
  key: string;
  label: string;
  strength: number;
};

export type RankedRecommendationV3 = {
  anime: Anime;
  score: number;
  confidence: "soft" | "good" | "strong" | "very_strong";
  explorationLevel: "safe" | "adjacent" | "exploratory";
  strongSignals: MatchSignal[];
  frictionSignals: FrictionSignal[];
  reasons: string[];
  featureBreakdown: Record<string, number>;
  sourceAgreement?: number;
  fingerprintConfidence?: number;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function confidenceFrom(
  score: number,
  fpConf: number,
  userConf: number,
): RankedRecommendationV3["confidence"] {
  const evidence = Math.min(fpConf, Math.max(0.35, userConf));
  const adjusted = score * (0.55 + evidence * 0.45);
  if (adjusted >= 0.78 && evidence >= 0.55) return "very_strong";
  if (adjusted >= 0.65) return "strong";
  if (adjusted >= 0.48) return "good";
  return "soft";
}

function explorationLevel(
  score: number,
  novelty: number,
): RankedRecommendationV3["explorationLevel"] {
  if (score >= 0.62) return "safe";
  if (score >= 0.42 || novelty >= 0.55) return "adjacent";
  return "exploratory";
}

export type RankV3Options = {
  excludeIds?: Set<number> | number[];
  experienceSlug?: string | null;
  sourceAgreement?: Map<number, number>;
  fingerprints?: Map<number, AnimePreferenceFingerprint>;
};

export function rankRecommendationsV3(
  candidates: Anime[],
  entries: WatchlistEntry[],
  opts?: RankV3Options,
): RankedRecommendationV3[] {
  const exclude = new Set(
    opts?.excludeIds
      ? Array.isArray(opts.excludeIds)
        ? opts.excludeIds
        : [...opts.excludeIds]
      : entries.map((e) => e.id),
  );

  const user = buildUserPreferenceVector(entries, {
    fingerprints: opts?.fingerprints,
  });
  const userVec = blendUserVector(user);
  const clusters = buildTasteClustersV3(entries, {
    fingerprints: opts?.fingerprints,
  });
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

  const emergingVec = { ...userVec };
  for (const t of trends.filter((x) => x.direction === "up").slice(0, 4)) {
    emergingVec[t.dimension] = Math.min(
      1,
      (emergingVec[t.dimension] ?? 0.5) + 0.15 * t.strength,
    );
  }

  const active = clusters.find((c) => c.state === "stable") || clusters[0];
  const W = RANKER_V3_WEIGHTS;
  const ranked: RankedRecommendationV3[] = [];

  for (const anime of candidates) {
    if (exclude.has(anime.id)) continue;

    let fp = opts?.fingerprints?.get(anime.id);
    if (!fp) fp = buildAnimePreferenceFingerprint(anime);

    const stableSim = vectorSimilarity(user.stable, fp, WEIGHTS_LONG_TERM);
    const clusterSim = active
      ? clusterAffinityV3(fp, active)
      : vectorSimilarity(userVec, fp, WEIGHTS_LONG_TERM);
    const emergingSim = vectorSimilarity(emergingVec, fp, WEIGHTS_LONG_TERM);

    let intentSim = stableSim * 0.85;
    if (exp) {
      const tip = buildAnimePreferenceFingerprint({
        id: -10,
        title: exp.label,
        description: exp.blurb || "",
        genre: exp.genreHints?.[0] || "",
        tags: exp.genreHints || [],
        status: "FINISHED",
        format: "TV",
        year: "",
        score: 0,
        popularity: 0,
        image: "",
        anilist_id: -10,
        episodes: 12,
        duration: 24,
      });
      const tv = fingerprintToVector(tip);
      const intentUser = { ...userVec };
      for (const [k, v] of Object.entries(tv)) {
        intentUser[k] = (intentUser[k] ?? 0.5) * 0.4 + v * 0.6;
      }
      intentSim = vectorSimilarity(intentUser, fp, WEIGHTS_TONIGHT);
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

    const { penalty: dropPen } = dropPenalty(
      dropSigs,
      anime.tags,
      String(anime.format || ""),
      anime.episodes,
    );

    const features: Record<string, number> = {
      stableTaste: stableSim,
      activeCluster: clusterSim,
      emergingTaste: emergingSim,
      viewingIntent: intentSim,
      fingerprint: fpSim,
      sourceAgreement: agreementScore,
      completionLikelihood: completion.probability,
      communityQuality: community,
      availability: 0.5,
      fatigue: fatiguePenalty,
      dropRisk: clamp01(dropPen),
    };

    let score =
      features.stableTaste * W.stableTaste +
      features.activeCluster * W.activeCluster +
      features.emergingTaste * W.emergingTaste +
      features.viewingIntent * W.viewingIntent +
      features.fingerprint * W.fingerprint +
      features.sourceAgreement * W.sourceAgreement +
      features.completionLikelihood * W.completionLikelihood +
      features.communityQuality * W.communityQuality +
      features.availability * W.availability -
      features.fatigue * W.fatigue -
      features.dropRisk * W.dropRisk;

    score = clamp01(score);

    const aligned = topAlignedDimensions(userVec, fp, 6);
    const strongSignals: MatchSignal[] = aligned
      .filter((a) => a.align >= 0.72 && Math.abs(a.item - 0.5) >= 0.12)
      .slice(0, 4)
      .map((a) => ({
        key: a.key,
        label: humanizeDimKey(a.key),
        strength: a.align,
      }));

    if (active && clusterSim >= 0.6) {
      strongSignals.unshift({
        key: "cluster",
        label: active.label,
        strength: clusterSim,
      });
    }

    const frictionSignals = detectFriction(anime, entries, {
      userVector: userVec,
      fingerprint: fp,
    });

    const reasons: string[] = [];
    if (strongSignals[0]) {
      reasons.push(`Aligns on ${strongSignals[0].label.toLowerCase()}`);
    }
    if (trends[0]?.direction === "up" && emergingSim >= 0.55) {
      reasons.push(`Matches rising ${trends[0].label.toLowerCase()}`);
    }
    if (exp && intentSim >= 0.55) {
      reasons.push(`Fits tonight · ${exp.label}`);
    }
    if (completion.probability >= 0.65 && completion.confidence >= 0.45) {
      reasons.push(completion.reasons[0] || "Good completion outlook");
    }
    if (frictionSignals[0] && frictionSignals[0].severity >= 0.45) {
      reasons.push(frictionSignals[0].message);
    }

    ranked.push({
      anime,
      score,
      confidence: confidenceFrom(score, fp.confidence.overall, user.confidence),
      explorationLevel: explorationLevel(score, novelty.value),
      strongSignals: strongSignals.slice(0, 4),
      frictionSignals: frictionSignals.slice(0, 3),
      reasons: reasons.slice(0, 5),
      featureBreakdown: features,
      sourceAgreement: agreement,
      fingerprintConfidence: fp.confidence.overall,
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  return applyExplorationBudget(ranked, budget);
}

function applyExplorationBudget(
  ranked: RankedRecommendationV3[],
  budget: { safe: number; adjacent: number; exploratory: number },
): RankedRecommendationV3[] {
  if (ranked.length <= 8) return ranked;
  const limit = Math.min(40, ranked.length);
  const nSafe = Math.round(limit * budget.safe);
  const nAdj = Math.round(limit * budget.adjacent);
  const nExp = Math.max(1, limit - nSafe - nAdj);

  const safe = ranked.filter((r) => r.explorationLevel === "safe");
  const adj = ranked.filter((r) => r.explorationLevel === "adjacent");
  const exp = ranked.filter((r) => r.explorationLevel === "exploratory");

  const out: RankedRecommendationV3[] = [];
  const used = new Set<number>();

  for (const r of safe) {
    if (out.filter((x) => x.explorationLevel === "safe").length >= nSafe) break;
    out.push(r);
    used.add(r.anime.id);
  }
  for (const r of adj) {
    if (used.has(r.anime.id)) continue;
    if (out.filter((x) => x.explorationLevel === "adjacent").length >= nAdj)
      break;
    out.push(r);
    used.add(r.anime.id);
  }
  for (const r of exp) {
    if (used.has(r.anime.id)) continue;
    if (
      out.filter((x) => x.explorationLevel === "exploratory").length >= nExp
    )
      break;
    out.push(r);
    used.add(r.anime.id);
  }
  for (const r of ranked) {
    if (out.length >= limit) break;
    if (used.has(r.anime.id)) continue;
    out.push(r);
    used.add(r.anime.id);
  }
  return out;
}

export function confidenceLabelV3(
  c: RankedRecommendationV3["confidence"],
): string {
  switch (c) {
    case "very_strong":
      return "Very strong";
    case "strong":
      return "Strong";
    case "good":
      return "Good";
    default:
      return "Soft";
  }
}
