"use client";

/**
 * Sprint 7 — Bridge for Actor / CharacterRenderer expression resolution.
 * Prefer this over ad-hoc expressionFromAnim + expressionFromEmotions calls.
 */

import type { MascotAnim, MascotEmotions } from "@/lib/mascot/types";
import {
  resolveExpression,
  type ExpressionKey,
} from "@/lib/mascot/expression-pipeline";
import { getClimbState, isClimbing } from "@/lib/mascot/climbing";

export function faceForActor(
  anim: MascotAnim,
  emotions: MascotEmotions,
  socialActive = false,
): ExpressionKey {
  const climb = getClimbState();
  return resolveExpression({
    anim,
    emotions,
    socialActive,
    climbPhase: isClimbing(climb) ? climb.phase : null,
  });
}

export type { ExpressionKey };
