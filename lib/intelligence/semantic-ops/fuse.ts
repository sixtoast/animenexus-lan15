import type { AnimePreferenceFingerprint } from "@/lib/intelligence/items/anime-preference-fingerprint";
import {
  emptyEmotional, emptyExperience, emptyNarrative, emptyStyle,
  EMOTIONAL_KEYS, EXPERIENCE_KEYS, NARRATIVE_KEYS, STYLE_KEYS,
} from "@/lib/intelligence/items/anime-preference-fingerprint";
import {
  ALL_DIM_KEYS, DEFAULT_DIM_WEIGHTS, clamp01, dimConfidence, dimValue, type DimKey,
} from "./dims";

export const MAX_DISTINCTIVE_WEIGHT_MULTIPLIER = 1.25;
export type FusionRatio = { weightA: number; weightB: number };

export function normalizeRatio(weightA: number): FusionRatio {
  const a = clamp01(weightA);
  return { weightA: a, weightB: clamp01(1 - a) };
}

export function fuseFingerprints(
  fpA: AnimePreferenceFingerprint,
  fpB: AnimePreferenceFingerprint,
  weightA = 0.5,
) {
  const ratio = normalizeRatio(weightA);
  const emotional = emptyEmotional();
  const narrative = emptyNarrative();
  const experience = emptyExperience();
  const style = emptyStyle();
  for (const k of EMOTIONAL_KEYS) {
    emotional[k] = clamp01(dimValue(fpA, `emotional.${k}`) * ratio.weightA + dimValue(fpB, `emotional.${k}`) * ratio.weightB);
  }
  for (const k of NARRATIVE_KEYS) {
    narrative[k] = clamp01(dimValue(fpA, `narrative.${k}`) * ratio.weightA + dimValue(fpB, `narrative.${k}`) * ratio.weightB);
  }
  for (const k of EXPERIENCE_KEYS) {
    experience[k] = clamp01(dimValue(fpA, `experience.${k}`) * ratio.weightA + dimValue(fpB, `experience.${k}`) * ratio.weightB);
  }
  for (const k of STYLE_KEYS) {
    style[k] = clamp01(dimValue(fpA, `style.${k}`) * ratio.weightA + dimValue(fpB, `style.${k}`) * ratio.weightB);
  }
  const confA = fpA.confidence?.overall ?? 0.4;
  const confB = fpB.confidence?.overall ?? 0.4;
  const target: AnimePreferenceFingerprint = {
    version: fpA.version || "fingerprint_v1",
    animeId: 0,
    emotional, narrative, experience, style,
    structure: {
      episodeCount: Math.round(((fpA.structure?.episodeCount || 12) * ratio.weightA + (fpB.structure?.episodeCount || 12) * ratio.weightB)),
      format: ratio.weightA >= 0.5 ? fpA.structure?.format : fpB.structure?.format,
    },
    confidence: { overall: clamp01(confA * ratio.weightA + confB * ratio.weightB), dimensions: {} },
    provenance: { sources: ["structure"], generatedAt: Date.now() },
  };
  function topDistinctive(fp: AnimePreferenceFingerprint, n = 4): DimKey[] {
    return ALL_DIM_KEYS.map((key) => ({
      key,
      score: Math.abs(dimValue(fp, key) - 0.5) * dimConfidence(fp, key),
    }))
      .filter((x) => x.score >= 0.12)
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((x) => x.key);
  }
  const distinctiveA = topDistinctive(fpA);
  const distinctiveB = topDistinctive(fpB);
  const matchWeights: Record<string, number> = { ...DEFAULT_DIM_WEIGHTS };
  for (const k of [...distinctiveA, ...distinctiveB]) {
    matchWeights[k] = Math.min((matchWeights[k] ?? 1) * MAX_DISTINCTIVE_WEIGHT_MULTIPLIER, 2);
  }
  return { target, ratio, distinctiveA, distinctiveB, matchWeights };
}

export function distanceToTarget(
  candidate: AnimePreferenceFingerprint,
  target: AnimePreferenceFingerprint,
  matchWeights?: Record<string, number>,
): number {
  const W = matchWeights || DEFAULT_DIM_WEIGHTS;
  let num = 0, den = 0;
  for (const key of ALL_DIM_KEYS) {
    const w = W[key] ?? 1;
    const conf = dimConfidence(candidate, key);
    num += w * Math.abs(dimValue(candidate, key) - dimValue(target, key)) * conf;
    den += w * conf;
  }
  return den > 0 ? num / den : 0.5;
}

export function fusionFit(
  candidate: AnimePreferenceFingerprint,
  target: AnimePreferenceFingerprint,
  matchWeights?: Record<string, number>,
): number {
  return clamp01(1 - distanceToTarget(candidate, target, matchWeights));
}

export function parentBalanceScore(fitA: number, fitB: number, ratio: FusionRatio): number {
  const total = fitA + fitB + 1e-6;
  const shareA = fitA / total;
  return clamp01(1 - Math.abs(shareA - ratio.weightA) * 1.5);
}
