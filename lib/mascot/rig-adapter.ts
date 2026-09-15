/**
 * Lantern-ko V3 renderer adapter.
 *
 * Engine state stays authoritative. This file translates the existing
 * expression/emotion/action/look state into continuous render channels only.
 * It is NOT a second brain or emotion system.
 */
import { sampleFace, type ExpressionKey } from "./expression";
import type { MascotAnim, MascotEmotions } from "./types";

export type FaceRigPose = {
  browL: number;
  browR: number;
  eyeOpenL: number;
  eyeOpenR: number;
  pupilX: number;
  pupilY: number;
  mouthOpen: number;
  mouthWide: number;
  mouthCurve: number;
  blush: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export function resolveFaceRigPose(
  expression: ExpressionKey,
  emotions: MascotEmotions,
  anim: MascotAnim,
  t: number,
  lookBias: { x: number; y: number },
  blink: number,
): FaceRigPose {
  const base = sampleFace(expression, t, lookBias.x, lookBias.y, blink);
  let mouthCurve = base.mouthCurve;
  let mouthOpen = base.mouthOpen;
  let blush = base.cheek;
  let eyeBias = 0;
  let headPitch = 0;
  let headRoll = base.headTilt;

  // Animation is presentation bias, never a second emotion brain.
  if (anim === "celebrate" || anim === "happy") {
    mouthCurve += 0.14;
    mouthOpen += 0.08;
    eyeBias += 0.05;
  } else if (anim === "wave" || anim === "nod") {
    mouthCurve += 0.07;
  } else if (anim === "bow" || anim === "shy") {
    blush += 0.12;
    eyeBias -= 0.08;
    headPitch += 0.04;
  } else if (anim === "sleep" || anim === "sit") {
    eyeBias -= 0.12;
    headPitch += 0.05;
  } else if (anim === "think") {
    headRoll += 0.035;
  }

  // Continuous emotion state makes repeated named expressions non-identical.
  eyeBias += (emotions.energy - 0.5) * 0.05 - emotions.sleepiness * 0.1;
  mouthCurve += (emotions.happiness - 0.5) * 0.08;
  blush += Math.max(0, emotions.happiness - 0.75) * 0.12;
  blush += Math.max(0, 0.55 - emotions.confidence) * 0.06;

  // Sleep / high sleepiness forces closed eyes regardless of blink sample.
  if (emotions.sleepiness > 0.72 || anim === "sleep") {
    eyeBias = Math.min(eyeBias, -0.85);
  }

  return {
    browL: base.browL,
    browR: base.browR,
    // Tiny stable asymmetry prevents a stamped/symmetrical face.
    eyeOpenL: clamp(base.eyeOpen + eyeBias + 0.012, 0, 1.4),
    eyeOpenR: clamp(base.eyeOpen + eyeBias - 0.018, 0, 1.4),
    pupilX: clamp(base.pupilX, -0.55, 0.55),
    pupilY: clamp(base.pupilY, -0.4, 0.4),
    mouthOpen: clamp(mouthOpen, 0, 1),
    mouthWide: clamp(base.mouthWide, 0.1, 1),
    mouthCurve: clamp(mouthCurve, -1, 1),
    blush: clamp(blush, 0, 1),
    headPitch: clamp(headPitch + lookBias.y * 0.05, -0.12, 0.12),
    headYaw: clamp(lookBias.x * 0.08, -0.08, 0.08),
    headRoll: clamp(headRoll, -0.15, 0.15),
  };
}
