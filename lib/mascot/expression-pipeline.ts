/**
 * Sprint 7 — Single expression resolution path.
 *
 * Priority (highest wins):
 *  1. Explicit social/gesture anim (wave, point, surprised, …)
 *  2. Locomotion-driven (walk / jump / land / sleep)
 *  3. Emotion baseline
 *
 * CharacterRenderer / mesh should only consume the resolved ExpressionKey.
 */

import type { MascotAnim, MascotEmotions } from "./types";

/** Face keys used by procedural mesh + GLB morph/pose tables. */
export type ExpressionKey =
  | "neutral"
  | "happy"
  | "excited"
  | "curious"
  | "think"
  | "sleepy"
  | "surprised"
  | "embarrassed"
  | "annoyed"
  | "proud"
  | "confused"
  | "sad"
  | "focused"
  | "playful"
  | "wave";

/** @deprecated alias — prefer ExpressionKey */
export type MascotExpression = ExpressionKey;

const ANIM_FACE: Partial<Record<MascotAnim, ExpressionKey>> = {
  happy: "happy",
  wave: "wave",
  think: "think",
  sleep: "sleepy",
  surprised: "surprised",
  point: "curious",
  jump: "excited",
  land: "happy",
  walk: "focused",
  idle: "neutral",
};

export function expressionFromAnim(
  anim: MascotAnim,
  fallback: ExpressionKey = "neutral",
): ExpressionKey {
  return ANIM_FACE[anim] ?? fallback;
}

export function expressionFromEmotions(e: MascotEmotions): ExpressionKey {
  if (e.stress > 0.65) return "annoyed";
  if (e.sleepiness > 0.7) return "sleepy";
  if (e.happiness > 0.75 && e.energy > 0.6) return "excited";
  if (e.happiness > 0.6) return "happy";
  if (e.curiosity > 0.65) return "curious";
  if (e.confidence > 0.7 && e.happiness > 0.45) return "proud";
  if (e.boredom > 0.65) return "confused";
  if (e.attention > 0.7) return "focused";
  if (e.energy > 0.75 && e.happiness > 0.4) return "playful";
  return "neutral";
}

export type ExpressionResolveInput = {
  anim: MascotAnim;
  emotions: MascotEmotions;
  /** Social layer still holding a gesture */
  socialActive?: boolean;
  climbPhase?: string | null;
};

/**
 * Canonical resolver used by Actor → CharacterRenderer.
 */
export function resolveExpression(input: ExpressionResolveInput): ExpressionKey {
  const { anim, emotions, socialActive, climbPhase } = input;

  // Climb-specific faces
  if (climbPhase === "jump" || climbPhase === "pull-up") return "excited";
  if (climbPhase === "grab") return "focused";
  if (climbPhase === "sit" || climbPhase === "balance") return "proud";
  if (climbPhase === "fall") return "surprised";

  // Gesture / social anims always win
  const socialAnims: MascotAnim[] = [
    "wave",
    "point",
    "happy",
    "think",
    "surprised",
  ];
  if (socialActive || socialAnims.includes(anim)) {
    return expressionFromAnim(anim, expressionFromEmotions(emotions));
  }

  // Strong locomotion
  if (anim === "jump" || anim === "land" || anim === "sleep") {
    return expressionFromAnim(anim);
  }

  // Emotion baseline (idle / walk)
  const emo = expressionFromEmotions(emotions);
  if (anim === "walk" && emo === "neutral") return "focused";
  if (anim === "walk") return emo;
  return emo;
}
