/**
 * Sprint 2 — Face & expressiveness
 *
 * Expression is independent of locomotion.
 * Keys match LanternKoMeshV2 ExpressionKey (same 15 strings).
 */

import type { MascotAnim, MascotEmotions } from "./types";

export type MascotExpression =
  | "neutral"
  | "happy"
  | "excited"
  | "curious"
  | "confused"
  | "surprised"
  | "embarrassed"
  | "sad"
  | "sleepy"
  | "scared"
  | "annoyed"
  | "proud"
  | "mischievous"
  | "focused"
  | "smug";

/** Alias used by mesh / GltfCompanion */
export type ExpressionKey = MascotExpression;

export type FacePose = {
  browL: number;
  browR: number;
  eyeOpen: number;
  pupilX: number;
  pupilY: number;
  mouthOpen: number;
  mouthWide: number;
  mouthCurve: number;
  cheek: number;
  headTilt: number;
};

const BASE: Record<MascotExpression, FacePose> = {
  neutral: {
    browL: 0,
    browR: 0,
    eyeOpen: 1,
    pupilX: 0,
    pupilY: 0,
    mouthOpen: 0.08,
    mouthWide: 0.35,
    mouthCurve: 0.15,
    cheek: 0.2,
    headTilt: 0,
  },
  happy: {
    browL: 0.35,
    browR: 0.35,
    eyeOpen: 0.95,
    pupilX: 0,
    pupilY: 0.05,
    mouthOpen: 0.22,
    mouthWide: 0.85,
    mouthCurve: 0.9,
    cheek: 0.55,
    headTilt: 0.04,
  },
  excited: {
    browL: 0.55,
    browR: 0.55,
    eyeOpen: 1,
    pupilX: 0,
    pupilY: 0.1,
    mouthOpen: 0.45,
    mouthWide: 0.95,
    mouthCurve: 1,
    cheek: 0.7,
    headTilt: 0.08,
  },
  curious: {
    browL: 0.45,
    browR: 0.1,
    eyeOpen: 1,
    pupilX: 0.15,
    pupilY: 0.05,
    mouthOpen: 0.28,
    mouthWide: 0.4,
    mouthCurve: 0.2,
    cheek: 0.25,
    headTilt: 0.12,
  },
  confused: {
    browL: 0.35,
    browR: -0.25,
    eyeOpen: 0.85,
    pupilX: -0.1,
    pupilY: 0,
    mouthOpen: 0.12,
    mouthWide: 0.3,
    mouthCurve: -0.1,
    cheek: 0.15,
    headTilt: -0.1,
  },
  surprised: {
    browL: 0.7,
    browR: 0.7,
    eyeOpen: 1.15,
    pupilX: 0,
    pupilY: 0.05,
    mouthOpen: 0.7,
    mouthWide: 0.5,
    mouthCurve: 0,
    cheek: 0.2,
    headTilt: 0,
  },
  embarrassed: {
    browL: -0.15,
    browR: -0.15,
    eyeOpen: 0.7,
    pupilX: 0.25,
    pupilY: -0.15,
    mouthOpen: 0.1,
    mouthWide: 0.45,
    mouthCurve: 0.25,
    cheek: 0.95,
    headTilt: 0.15,
  },
  sad: {
    browL: -0.4,
    browR: -0.4,
    eyeOpen: 0.65,
    pupilX: 0,
    pupilY: -0.2,
    mouthOpen: 0.08,
    mouthWide: 0.35,
    mouthCurve: -0.75,
    cheek: 0.1,
    headTilt: -0.05,
  },
  sleepy: {
    browL: -0.25,
    browR: -0.25,
    eyeOpen: 0.25,
    pupilX: 0,
    pupilY: -0.1,
    mouthOpen: 0.05,
    mouthWide: 0.3,
    mouthCurve: 0.05,
    cheek: 0.15,
    headTilt: 0.08,
  },
  scared: {
    browL: 0.6,
    browR: 0.6,
    eyeOpen: 1.2,
    pupilX: 0,
    pupilY: 0.15,
    mouthOpen: 0.55,
    mouthWide: 0.4,
    mouthCurve: -0.2,
    cheek: 0.1,
    headTilt: 0,
  },
  annoyed: {
    browL: -0.45,
    browR: -0.45,
    eyeOpen: 0.75,
    pupilX: 0,
    pupilY: 0,
    mouthOpen: 0.06,
    mouthWide: 0.25,
    mouthCurve: -0.4,
    cheek: 0.15,
    headTilt: 0,
  },
  proud: {
    browL: 0.25,
    browR: 0.25,
    eyeOpen: 0.95,
    pupilX: 0,
    pupilY: 0.05,
    mouthOpen: 0.18,
    mouthWide: 0.7,
    mouthCurve: 0.7,
    cheek: 0.4,
    headTilt: -0.04,
  },
  mischievous: {
    browL: 0.4,
    browR: -0.05,
    eyeOpen: 0.8,
    pupilX: 0.2,
    pupilY: 0,
    mouthOpen: 0.15,
    mouthWide: 0.55,
    mouthCurve: 0.55,
    cheek: 0.3,
    headTilt: 0.1,
  },
  focused: {
    browL: -0.15,
    browR: -0.15,
    eyeOpen: 0.9,
    pupilX: 0,
    pupilY: 0.1,
    mouthOpen: 0.05,
    mouthWide: 0.25,
    mouthCurve: 0,
    cheek: 0.15,
    headTilt: 0,
  },
  smug: {
    browL: 0.3,
    browR: -0.1,
    eyeOpen: 0.7,
    pupilX: 0,
    pupilY: 0,
    mouthOpen: 0.12,
    mouthWide: 0.5,
    mouthCurve: 0.5,
    cheek: 0.35,
    headTilt: 0.06,
  },
};

export function expressionFromEmotions(e: MascotEmotions): MascotExpression {
  if (e.sleepiness > 0.72) return "sleepy";
  if (e.stress > 0.7) return "scared";
  if (e.stress > 0.45 && e.happiness < 0.35) return "annoyed";
  if (e.happiness > 0.75 && e.energy > 0.65) return "excited";
  if (e.happiness > 0.62) return "happy";
  if (e.confidence > 0.7 && e.happiness > 0.5) return "proud";
  if (e.curiosity > 0.65 && e.attention > 0.5) return "curious";
  if (e.boredom > 0.55 && e.curiosity < 0.4) return "confused";
  if (e.happiness < 0.28 && e.energy < 0.4) return "sad";
  if (e.attention > 0.7 && e.curiosity > 0.45) return "focused";
  return "neutral";
}

export function expressionFromAnim(
  anim: MascotAnim,
  fallback: MascotExpression,
): MascotExpression {
  switch (anim) {
    case "happy":
    case "celebrate":
    case "wave":
      return "happy";
    case "surprised":
      return "surprised";
    case "point":
      return "curious";
    case "think":
    case "nod":
      return "focused";
    case "sleep":
    case "sit":
      return "sleepy";
    case "shy":
    case "bow":
      return "embarrassed";
    case "stretch":
      return "mischievous";
    case "jump":
    case "run":
      return fallback === "neutral" ? "excited" : fallback;
    default:
      return fallback;
  }
}

export function sampleFace(
  expression: MascotExpression,
  t: number,
  lookX: number,
  lookY: number,
  blink: number,
): FacePose {
  const b = BASE[expression] ?? BASE.neutral;
  const micro = Math.sin(t * 1.7) * 0.02;
  const pupilTrackX = Math.max(-0.55, Math.min(0.55, lookX * 0.45 + b.pupilX));
  const pupilTrackY = Math.max(-0.4, Math.min(0.4, -lookY * 0.3 + b.pupilY));
  const eyeOpen = Math.max(0, b.eyeOpen * (1 - blink * 0.95));

  return {
    browL: b.browL + micro,
    browR: b.browR - micro * 0.6,
    eyeOpen,
    pupilX: pupilTrackX,
    pupilY: pupilTrackY,
    mouthOpen:
      b.mouthOpen +
      (expression === "excited" ? Math.abs(Math.sin(t * 8)) * 0.08 : 0),
    mouthWide: b.mouthWide,
    mouthCurve: b.mouthCurve,
    cheek: b.cheek,
    headTilt: b.headTilt + Math.sin(t * 0.9) * 0.015,
  };
}
