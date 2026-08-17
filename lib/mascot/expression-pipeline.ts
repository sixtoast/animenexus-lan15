/**
 * Sprint 7 — Single expression resolution path.
 *
 * Priority (highest wins):
 *  1. Climb phase face
 *  2. Explicit social/gesture anim (wave, point, surprised, …)
 *  3. Locomotion-driven (walk / jump / land / sleep)
 *  4. Emotion baseline
 *
 * ExpressionKey is the mesh-aligned set from expression.ts / LanternKoMeshV2.
 */

import type { MascotAnim, MascotEmotions } from "./types";
import {
  expressionFromAnim as baseFromAnim,
  expressionFromEmotions as baseFromEmotions,
  type ExpressionKey,
} from "./expression";

export type { ExpressionKey };
/** @deprecated alias */
export type MascotExpression = ExpressionKey;

export function expressionFromAnim(
  anim: MascotAnim,
  fallback: ExpressionKey = "neutral",
): ExpressionKey {
  return baseFromAnim(anim, fallback);
}

export function expressionFromEmotions(e: MascotEmotions): ExpressionKey {
  return baseFromEmotions(e);
}

export type ExpressionResolveInput = {
  anim: MascotAnim;
  emotions: MascotEmotions;
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
