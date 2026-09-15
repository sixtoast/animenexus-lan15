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

/** Socket-safe pupil travel (tighter than legacy ±0.55 so iris stays in eye). */
const PUPIL_X_MAX = 0.42;
const PUPIL_Y_MAX = 0.28;

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
  // Celebrate/happy kept lively but restrained so base expression still reads.
  if (anim === "celebrate" || anim === "happy") {
    mouthCurve += 0.1;
    mouthOpen += 0.06;
    eyeBias += 0.04;
  } else if (anim === "wave" || anim === "nod") {
    mouthCurve += 0.06;
  } else if (anim === "bow" || anim === "shy") {
    blush += 0.14;
    eyeBias -= 0.08;
    headPitch += 0.045;
  } else if (anim === "sleep" || anim === "sit") {
    eyeBias -= 0.14;
    headPitch += 0.055;
  } else if (anim === "think") {
    headRoll += 0.035;
  }

  // Continuous emotion state makes repeated named expressions non-identical.
  eyeBias += (emotions.energy - 0.5) * 0.05 - emotions.sleepiness * 0.12;
  mouthCurve += (emotions.happiness - 0.5) * 0.08;
  blush += Math.max(0, emotions.happiness - 0.75) * 0.12;
  blush += Math.max(0, 0.55 - emotions.confidence) * 0.06;

  // Named embarrassed expression needs readable colour on small mobile scale.
  if (expression === "embarrassed") {
    blush = Math.max(blush, 0.72) + 0.12;
  }

  // Sleep / high sleepiness forces nearly closed eyes regardless of blink sample.
  if (emotions.sleepiness > 0.72 || anim === "sleep") {
    eyeBias = Math.min(eyeBias, -0.92);
  }

  // Micro-saccades — tiny high-frequency noise on gaze only (not engine lookBias).
  const saccadeX = Math.sin(t * 17.3) * 0.012 + Math.sin(t * 31.1) * 0.006;
  const saccadeY = Math.cos(t * 19.7) * 0.009 + Math.sin(t * 27.4) * 0.005;

  return {
    browL: base.browL,
    browR: base.browR,
    // Tiny stable asymmetry prevents a stamped/symmetrical face.
    eyeOpenL: clamp(base.eyeOpen + eyeBias + 0.012, 0, 1.4),
    eyeOpenR: clamp(base.eyeOpen + eyeBias - 0.018, 0, 1.4),
    pupilX: clamp(base.pupilX + saccadeX, -PUPIL_X_MAX, PUPIL_X_MAX),
    pupilY: clamp(base.pupilY + saccadeY, -PUPIL_Y_MAX, PUPIL_Y_MAX),
    mouthOpen: clamp(mouthOpen, 0, 1),
    mouthWide: clamp(base.mouthWide, 0.1, 1),
    mouthCurve: clamp(mouthCurve, -1, 1),
    blush: clamp(blush, 0, 1),
    headPitch: clamp(headPitch + lookBias.y * 0.06, -0.13, 0.13),
    headYaw: clamp(lookBias.x * 0.09, -0.09, 0.09),
    headRoll: clamp(headRoll, -0.15, 0.15),
  };
}
