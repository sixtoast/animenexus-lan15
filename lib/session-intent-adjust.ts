/**
 * Canonical session modifier: Energy / Attention / Intensity in fingerprint space.
 * ONE production path — buildSessionAdjustedIntent → fingerprintIntentFit.
 *
 * Intensity = amplify primary MOOD dimensions (not generic Action).
 * Energy = pacing / actionIntensity overlay only.
 * Attention = cognitive load / complexity / accessibility overlay only.
 */

import type { ExperienceIntent } from "./viewing-intent-types";
import type {
  IntentFingerprintTarget,
  IntentFingerprintWeights,
  SessionIntentControls,
} from "./viewing-intent-types";
import type { IntentSession } from "./intent-session";

const MAX_DIMENSION_WEIGHT = 2.5;

export type ModifierDebug = {
  baseTarget: IntentFingerprintTarget;
  intensity: string;
  energy: string;
  attention: string;
  primaryKeys: string[];
  afterIntensity: IntentFingerprintTarget;
  afterEnergy: IntentFingerprintTarget;
  afterAttention: IntentFingerprintTarget;
  finalTarget: IntentFingerprintTarget;
  finalWeights: IntentFingerprintWeights;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function cloneTarget(t: IntentFingerprintTarget): IntentFingerprintTarget {
  return { ...t };
}

function cloneWeights(w: IntentFingerprintWeights): IntentFingerprintWeights {
  return { ...w };
}

/** Primary mood dimensions: weight >= 1.0, else top 4 by weight. */
export function primaryMoodKeys(
  target: IntentFingerprintTarget,
  weights: IntentFingerprintWeights,
): string[] {
  const keys = Object.keys(target);
  const heavy = keys.filter((k) => (weights[k] ?? 1) >= 1.0);
  if (heavy.length >= 2) return heavy;
  return keys
    .slice()
    .sort((a, b) => (weights[b] ?? 1) - (weights[a] ?? 1))
    .slice(0, 4);
}

/**
 * Intensity amplifies distance of PRIMARY mood dims from neutral 0.5.
 * Does NOT inject actionIntensity unless it is already a primary mood dim.
 */
function applyIntensity(
  target: IntentFingerprintTarget,
  weights: IntentFingerprintWeights,
  intensity: "light" | "moderate" | "maximum",
  primary: string[],
): { target: IntentFingerprintTarget; weights: IntentFingerprintWeights } {
  const t = cloneTarget(target);
  const w = cloneWeights(weights);
  if (intensity === "moderate") return { target: t, weights: w };

  const scale = intensity === "light" ? 0.65 : 1.25;
  const wScale = intensity === "light" ? 0.85 : 1.15;

  for (const key of primary) {
    const cur = t[key];
    if (typeof cur !== "number") continue;
    const delta = cur - 0.5;
    t[key] = clamp01(0.5 + delta * scale);
    w[key] = Math.min(MAX_DIMENSION_WEIGHT, (w[key] ?? 1) * wScale);
  }
  return { target: t, weights: w };
}

function blendDim(
  target: IntentFingerprintTarget,
  weights: IntentFingerprintWeights,
  key: string,
  overlayTarget: number,
  overlayWeight: number,
): void {
  const moodT = target[key];
  const moodW = weights[key] ?? 0;
  if (typeof moodT === "number" && moodW > 0) {
    const combinedW = moodW + overlayWeight;
    target[key] = clamp01(
      (moodT * moodW + overlayTarget * overlayWeight) / combinedW,
    );
    weights[key] = Math.min(MAX_DIMENSION_WEIGHT, combinedW);
  } else {
    target[key] = clamp01(overlayTarget);
    weights[key] = Math.min(
      MAX_DIMENSION_WEIGHT,
      (weights[key] ?? 0) + overlayWeight,
    );
  }
}

function applyEnergy(
  target: IntentFingerprintTarget,
  weights: IntentFingerprintWeights,
  energy: "low" | "medium" | "high",
): { target: IntentFingerprintTarget; weights: IntentFingerprintWeights } {
  const t = cloneTarget(target);
  const w = cloneWeights(weights);
  if (energy === "medium") return { target: t, weights: w };

  if (energy === "low") {
    blendDim(t, w, "experience.pacing", 0.28, 1.2);
    blendDim(t, w, "experience.actionIntensity", 0.3, 0.6);
  } else {
    blendDim(t, w, "experience.pacing", 0.78, 1.2);
    blendDim(t, w, "experience.actionIntensity", 0.7, 0.55);
  }
  return { target: t, weights: w };
}

function applyAttention(
  target: IntentFingerprintTarget,
  weights: IntentFingerprintWeights,
  attention: "easy" | "medium" | "demanding",
  exp: ExperienceIntent,
): { target: IntentFingerprintTarget; weights: IntentFingerprintWeights } {
  const t = cloneTarget(target);
  const w = cloneWeights(weights);
  if (attention === "medium") return { target: t, weights: w };

  if (attention === "easy") {
    blendDim(t, w, "experience.cognitiveLoad", 0.25, 1.5);
    blendDim(t, w, "narrative.narrativeComplexity", 0.3, 1.2);
    blendDim(t, w, "experience.accessibility", 0.85, 1.2);
    blendDim(t, w, "style.dialogueDensity", 0.4, 0.55);
  } else {
    blendDim(t, w, "experience.cognitiveLoad", 0.8, 1.45);
    blendDim(t, w, "narrative.narrativeComplexity", 0.78, 1.2);
    const cerebral =
      typeof t["narrative.mysteryDensity"] === "number" ||
      typeof exp.fingerprintTarget["narrative.mysteryDensity"] === "number" ||
      exp.slug === "think" ||
      exp.slug === "tense";
    if (cerebral) {
      blendDim(t, w, "narrative.mysteryDensity", 0.7, 0.35);
    }
  }
  return { target: t, weights: w };
}

function applySurpriseIntensity(
  intensity: "light" | "moderate" | "maximum",
): { noveltyTarget: number } {
  if (intensity === "light") return { noveltyTarget: 0.55 };
  if (intensity === "maximum") return { noveltyTarget: 0.9 };
  return { noveltyTarget: 0.72 };
}

/**
 * Canonical production entry: Mood + Energy + Attention + Intensity → adjusted target.
 * Does not mutate the underlying ExperienceIntent definition.
 */
export function buildSessionAdjustedIntent(
  exp: ExperienceIntent,
  session?: SessionIntentControls | IntentSession | null,
): {
  target: IntentFingerprintTarget;
  weights: IntentFingerprintWeights;
  modifierDebug: ModifierDebug;
  noveltyTarget?: number;
} {
  const baseTarget = cloneTarget(exp.fingerprintTarget);
  const baseWeights = cloneWeights(exp.fingerprintWeights || {});
  const intensity = session?.intensity ?? "moderate";
  const energy = session?.energy ?? "medium";
  const attention = session?.attention ?? "medium";

  if (exp.slug === "surprise") {
    const nov = applySurpriseIntensity(intensity);
    const debug: ModifierDebug = {
      baseTarget,
      intensity,
      energy,
      attention,
      primaryKeys: [],
      afterIntensity: baseTarget,
      afterEnergy: baseTarget,
      afterAttention: baseTarget,
      finalTarget: baseTarget,
      finalWeights: baseWeights,
    };
    return {
      target: baseTarget,
      weights: baseWeights,
      modifierDebug: debug,
      noveltyTarget: nov.noveltyTarget,
    };
  }

  const primary = primaryMoodKeys(baseTarget, baseWeights);
  const afterI = applyIntensity(baseTarget, baseWeights, intensity, primary);
  const afterE = applyEnergy(afterI.target, afterI.weights, energy);
  const afterA = applyAttention(afterE.target, afterE.weights, attention, exp);

  const debug: ModifierDebug = {
    baseTarget,
    intensity,
    energy,
    attention,
    primaryKeys: primary,
    afterIntensity: afterI.target,
    afterEnergy: afterE.target,
    afterAttention: afterA.target,
    finalTarget: afterA.target,
    finalWeights: afterA.weights,
  };

  return {
    target: afterA.target,
    weights: afterA.weights,
    modifierDebug: debug,
  };
}
