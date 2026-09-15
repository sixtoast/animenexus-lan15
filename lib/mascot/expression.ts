/**
 * Sprint 2 — Face & expressiveness
 *
 * Expression is independent of locomotion.
 * Keys match LanternKoMeshV2 ExpressionKey (same 15 strings).
 * Cute-again pass: softer smiles, open neutral, less dead-eyed embarrassed.
 */

import type { MascotAnim, MascotEmotions } from "./types";
import { FACE_TUNING } from "./face-tuning";

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

/**
 * Base poses tuned for anime/chibi cuteness at product scale.
 * mouthCurve is intentionally softer so smile + gaze never reads as horror.
 */
const BASE: Record<MascotExpression, FacePose> = {
  neutral: {
    browL: 0.02,
    browR: -0.02,
    eyeOpen: 1.02,
    pupilX: 0.02,
    pupilY: 0.01,
    mouthOpen: 0.04,
    mouthWide: 0.28,
    mouthCurve: 0.06,
    cheek: 0.12,
    headTilt: 0.01,
  },
  happy: {
    browL: 0.22,
    browR: 0.22,
    eyeOpen: 1.0,
    pupilX: 0,
    pupilY: 0.04,
    mouthOpen: 0.12,
    mouthWide: 0.58,
    mouthCurve: 0.52,
    cheek: 0.32,
    headTilt: 0.03,
  },
  excited: {
    browL: 0.4,
    browR: 0.4,
    eyeOpen: 1.08,
    pupilX: 0,
    pupilY: 0.06,
    mouthOpen: 0.28,
    mouthWide: 0.72,
    mouthCurve: 0.7,
    cheek: 0.45,
    headTilt: 0.05,
  },
  curious: {
    browL: 0.38,
    browR: 0.08,
    eyeOpen: 1.1,
    pupilX: 0.08,
    pupilY: 0.04,
    mouthOpen: 0.1,
    mouthWide: 0.32,
    mouthCurve: 0.12,
    cheek: 0.18,
    headTilt: 0.08,
  },
  confused: {
    browL: 0.28,
    browR: -0.18,
    eyeOpen: 0.95,
    pupilX: -0.06,
    pupilY: 0,
    mouthOpen: 0.08,
    mouthWide: 0.28,
    mouthCurve: -0.08,
    cheek: 0.12,
    headTilt: -0.06,
  },
  surprised: {
    browL: 0.55,
    browR: 0.55,
    eyeOpen: 1.18,
    pupilX: 0,
    pupilY: 0.04,
    mouthOpen: 0.45,
    mouthWide: 0.42,
    mouthCurve: 0.05,
    cheek: 0.15,
    headTilt: 0,
  },
  embarrassed: {
    browL: -0.08,
    browR: -0.08,
    eyeOpen: 0.92,
    pupilX: 0.12,
    pupilY: -0.06,
    mouthOpen: 0.06,
    mouthWide: 0.32,
    mouthCurve: 0.1,
    cheek: 0.78,
    headTilt: 0.1,
  },
  sad: {
    browL: -0.32,
    browR: -0.32,
    eyeOpen: 0.82,
    pupilX: 0,
    pupilY: -0.08,
    mouthOpen: 0.05,
    mouthWide: 0.28,
    mouthCurve: -0.45,
    cheek: 0.08,
    headTilt: -0.04,
  },
  sleepy: {
    browL: -0.12,
    browR: -0.12,
    eyeOpen: 0.38,
    pupilX: 0,
    pupilY: -0.05,
    mouthOpen: 0.03,
    mouthWide: 0.25,
    mouthCurve: 0.04,
    cheek: 0.1,
    headTilt: 0.06,
  },
  scared: {
    browL: 0.48,
    browR: 0.48,
    eyeOpen: 1.15,
    pupilX: 0,
    pupilY: 0.08,
    mouthOpen: 0.35,
    mouthWide: 0.36,
    mouthCurve: -0.12,
    cheek: 0.08,
    headTilt: 0,
  },
  annoyed: {
    browL: -0.32,
    browR: -0.28,
    eyeOpen: 0.88,
    pupilX: 0.04,
    pupilY: 0,
    mouthOpen: 0.04,
    mouthWide: 0.22,
    mouthCurve: -0.28,
    cheek: 0.1,
    headTilt: 0.02,
  },
  proud: {
    browL: 0.18,
    browR: 0.18,
    eyeOpen: 1.0,
    pupilX: 0,
    pupilY: 0.03,
    mouthOpen: 0.1,
    mouthWide: 0.5,
    mouthCurve: 0.42,
    cheek: 0.28,
    headTilt: -0.03,
  },
  mischievous: {
    browL: 0.32,
    browR: -0.04,
    eyeOpen: 0.95,
    pupilX: 0.1,
    pupilY: 0,
    mouthOpen: 0.08,
    mouthWide: 0.45,
    mouthCurve: 0.38,
    cheek: 0.22,
    headTilt: 0.06,
  },
  focused: {
    browL: -0.1,
    browR: -0.1,
    eyeOpen: 0.98,
    pupilX: 0,
    pupilY: 0.05,
    mouthOpen: 0.03,
    mouthWide: 0.22,
    mouthCurve: 0.02,
    cheek: 0.1,
    headTilt: 0,
  },
  smug: {
    browL: 0.22,
    browR: -0.06,
    eyeOpen: 0.9,
    pupilX: 0.02,
    pupilY: 0,
    mouthOpen: 0.07,
    mouthWide: 0.4,
    mouthCurve: 0.35,
    cheek: 0.25,
    headTilt: 0.04,
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

/** Soft-compress look so everyday pointer motion stays central. */
function softGaze(v: number, normal: number, strong: number): number {
  const a = Math.abs(v);
  if (a <= 1) {
    // Quadratic ease: small movements stay near centre
    const eased = a * a;
    return Math.sign(v) * (normal * (1 - eased) + strong * eased);
  }
  return Math.sign(v) * strong;
}

export function sampleFace(
  expression: MascotExpression,
  t: number,
  lookX: number,
  lookY: number,
  blink: number,
): FacePose {
  const b = BASE[expression] ?? BASE.neutral;
  const micro = Math.sin(t * 1.7) * 0.015;
  const gx = softGaze(lookX, FACE_TUNING.normalGazeX, FACE_TUNING.strongGazeX);
  const gy = softGaze(lookY, FACE_TUNING.normalGazeY, FACE_TUNING.strongGazeY);
  const pupilTrackX = Math.max(
    -FACE_TUNING.pupilXMax,
    Math.min(FACE_TUNING.pupilXMax, gx + b.pupilX * 0.5),
  );
  const pupilTrackY = Math.max(
    -FACE_TUNING.pupilYMax,
    Math.min(FACE_TUNING.pupilYMax, -gy + b.pupilY * 0.5),
  );
  // Blink fully closes; open recovers to base without overshoot.
  const eyeOpen = Math.max(0, b.eyeOpen * (1 - blink * 0.98));

  return {
    browL: b.browL + micro,
    browR: b.browR - micro * 0.55,
    eyeOpen,
    pupilX: pupilTrackX,
    pupilY: pupilTrackY,
    mouthOpen:
      b.mouthOpen +
      (expression === "excited" ? Math.abs(Math.sin(t * 6)) * 0.05 : 0),
    mouthWide: b.mouthWide,
    mouthCurve: b.mouthCurve,
    cheek: b.cheek,
    headTilt: b.headTilt + Math.sin(t * 0.85) * 0.012,
  };
}
