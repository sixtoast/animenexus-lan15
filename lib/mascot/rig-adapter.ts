/**
 * Lantern-ko V3 renderer adapter.
 *
 * Engine state stays authoritative. This file translates the existing
 * expression/emotion/action/look state into continuous render channels only.
 * It is NOT a second brain or emotion system.
 *
 * Cute-again pass: reduced everyday gaze, softer openness floors,
 * smile/eye coordination, near-invisible saccades, soft break of dead stare.
 */
import { sampleFace, type ExpressionKey } from "./expression";
import type { MascotAnim, MascotEmotions } from "./types";
import { FACE_TUNING } from "./face-tuning";

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

  // Animation presentation bias — restrained so base expression still reads cute.
  if (anim === "celebrate" || anim === "happy") {
    mouthCurve += 0.08;
    mouthOpen += 0.04;
    eyeBias += 0.03;
  } else if (anim === "wave" || anim === "nod") {
    mouthCurve += 0.05;
  } else if (anim === "bow" || anim === "shy") {
    blush += 0.1;
    eyeBias -= 0.04;
    headPitch += 0.035;
  } else if (anim === "sleep" || anim === "sit") {
    eyeBias -= 0.12;
    headPitch += 0.045;
  } else if (anim === "think") {
    headRoll += 0.028;
  }

  // Continuous emotion — sleepiness only strongly affects when actually tired.
  eyeBias += (emotions.energy - 0.5) * 0.03;
  if (emotions.sleepiness > 0.45) {
    eyeBias -= (emotions.sleepiness - 0.45) * 0.22;
  }
  mouthCurve += (emotions.happiness - 0.5) * 0.06;
  blush += Math.max(0, emotions.happiness - 0.78) * 0.1;
  blush += Math.max(0, 0.5 - emotions.confidence) * 0.05;

  if (expression === "embarrassed") {
    blush = Math.max(blush, 0.62) + 0.08;
  }

  // Mouth ↔ eye coordination: a warm smile should not pair with intense fixed eyes.
  if (mouthCurve > 0.35) {
    eyeBias += 0.04; // slightly softer / more open lids with positive smile
    // Pull pupils a touch toward centre so smile + side-stare is less creepy
    base.pupilX *= 0.75;
    base.pupilY *= 0.8;
  }

  // Sleep / high sleepiness forces closed eyes.
  const isSleep = emotions.sleepiness > 0.72 || anim === "sleep";
  if (isSleep) {
    eyeBias = Math.min(eyeBias, -0.95);
  }

  let eyeOpenL = base.eyeOpen + eyeBias + 0.01;
  let eyeOpenR = base.eyeOpen + eyeBias - 0.012;

  // Non-sleep expressions stay in a cute open range (not half-lidded default).
  if (!isSleep && blink < 0.15) {
    eyeOpenL = Math.max(eyeOpenL, FACE_TUNING.neutralEyeOpenFloor * 0.92);
    eyeOpenR = Math.max(eyeOpenR, FACE_TUNING.neutralEyeOpenFloor * 0.9);
  }

  // Micro-saccades — almost invisible at product scale.
  const saccadeX =
    Math.sin(t * 13.1) * FACE_TUNING.saccadeAmpX +
    Math.sin(t * 23.7) * (FACE_TUNING.saccadeAmpX * 0.45);
  const saccadeY =
    Math.cos(t * 15.4) * FACE_TUNING.saccadeAmpY +
    Math.sin(t * 21.2) * (FACE_TUNING.saccadeAmpY * 0.4);

  let pupilX = base.pupilX + saccadeX;
  let pupilY = base.pupilY + saccadeY;

  // Soft break of haunted-doll stare: when looking nearly centre, bias slightly.
  const lookMag = Math.hypot(lookBias.x, lookBias.y);
  if (lookMag < 0.12 && !isSleep) {
    pupilX += FACE_TUNING.directStarePupilBias * Math.sin(t * 0.37 + 0.8);
    pupilY += FACE_TUNING.directStarePupilBias * 0.45 * Math.cos(t * 0.29);
    headRoll += FACE_TUNING.directStareRoll * Math.sin(t * 0.31);
  }

  // Disable saccades / gaze fight during sleep.
  if (isSleep) {
    pupilX *= 0.15;
    pupilY *= 0.15;
  }

  return {
    browL: base.browL,
    browR: base.browR,
    eyeOpenL: clamp(eyeOpenL, 0, 1.25),
    eyeOpenR: clamp(eyeOpenR, 0, 1.25),
    pupilX: clamp(pupilX, -FACE_TUNING.pupilXMax, FACE_TUNING.pupilXMax),
    pupilY: clamp(pupilY, -FACE_TUNING.pupilYMax, FACE_TUNING.pupilYMax),
    mouthOpen: clamp(mouthOpen, 0, 1),
    mouthWide: clamp(base.mouthWide, 0.1, 1),
    mouthCurve: clamp(mouthCurve, -1, 1),
    blush: clamp(blush, 0, 1),
    headPitch: clamp(
      headPitch + lookBias.y * FACE_TUNING.headPitchGain,
      -FACE_TUNING.headPitchMax,
      FACE_TUNING.headPitchMax,
    ),
    headYaw: clamp(
      lookBias.x * FACE_TUNING.headYawGain,
      -FACE_TUNING.headYawMax,
      FACE_TUNING.headYawMax,
    ),
    headRoll: clamp(headRoll, -FACE_TUNING.headRollMax, FACE_TUNING.headRollMax),
  };
}
