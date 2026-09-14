/**
 * Simkl behavioural / community signals.
 * ONLY maps fields actually returned by the adapter.
 * Does NOT invent darkness/pacing/complexity from drop or rating.
 */
import { clamp01 } from "@/lib/intelligence/semantic-ops/dims";

export type SimklBehaviourInput = {
  dropRate01?: number | null;
  rating?: number | null;
  votes?: number | null;
  rank?: number | null;
};

export type SimklBehaviourSignals = {
  dropRisk: number | null;
  completionLikelihood: number | null;
  communityQuality01: number | null;
  hasBehaviourEvidence: boolean;
  hasCommunityEvidence: boolean;
};

export function mapSimklBehaviour(
  input: SimklBehaviourInput | null | undefined,
): SimklBehaviourSignals {
  if (!input) {
    return {
      dropRisk: null,
      completionLikelihood: null,
      communityQuality01: null,
      hasBehaviourEvidence: false,
      hasCommunityEvidence: false,
    };
  }

  let dropRisk: number | null = null;
  let completionLikelihood: number | null = null;
  if (
    typeof input.dropRate01 === "number" &&
    Number.isFinite(input.dropRate01)
  ) {
    dropRisk = clamp01(input.dropRate01);
    completionLikelihood = clamp01(1 - dropRisk);
  }

  let communityQuality01: number | null = null;
  if (typeof input.rating === "number" && Number.isFinite(input.rating)) {
    const r = input.rating > 10 ? input.rating / 100 : input.rating / 10;
    communityQuality01 = clamp01(r);
  }

  return {
    dropRisk,
    completionLikelihood,
    communityQuality01,
    hasBehaviourEvidence: dropRisk != null,
    hasCommunityEvidence: communityQuality01 != null,
  };
}

export function applyBehaviourSecondary(
  semanticPrimary: number,
  signals: SimklBehaviourSignals,
  weight = 0.1,
): number {
  if (!signals.hasBehaviourEvidence || signals.completionLikelihood == null) {
    return semanticPrimary;
  }
  const w = Math.max(0, Math.min(0.15, weight));
  return clamp01(
    semanticPrimary * (1 - w) + signals.completionLikelihood * w,
  );
}
