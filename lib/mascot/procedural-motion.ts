/**
 * Procedural motion — calm at home, springy when freed.
 */

import type { MotionProfile } from "./emotions";
import type { MascotAnim } from "./types";

export type ProceduralPose = {
  scaleY: number;
  scaleX: number;
  bob: number;
  headPitch: number;
  headYaw: number;
  blink: number;
  tipPulse: number;
};

let blinkTimer = 0;
let blinkPhase = 0;

export function sampleProcedural(
  t: number,
  anim: MascotAnim,
  motion: MotionProfile,
  opts: {
    onGround: boolean;
    vy: number;
    lookX: number;
    lookY: number;
    phase: "home" | "outing" | "returning" | "drag";
  },
): ProceduralPose {
  const freed =
    opts.phase === "outing" ||
    opts.phase === "returning" ||
    opts.phase === "drag";

  const breathSpeed = anim === "sleep" ? 1.1 : freed ? 3.1 : 2.2;
  const breath =
    Math.sin(t * breathSpeed) *
    (freed ? 0.02 : 0.012) *
    (anim === "sleep" ? 0.6 : 1);

  const sway =
    anim === "idle" || anim === "sleep"
      ? Math.sin(t * (freed ? 2.4 : 1.3)) *
        (freed ? 0.022 : 0.01) *
        motion.bobAmp
      : freed
        ? Math.sin(t * 3.2) * 0.014
        : 0;

  const walkBob =
    anim === "walk" && opts.onGround
      ? Math.abs(Math.sin(t * (freed ? 14 : 10))) *
        (freed ? 0.042 : 0.028) *
        motion.bobAmp
      : 0;

  let scaleY = 1;
  let scaleX = 1;
  if (anim === "jump" || !opts.onGround) {
    if (opts.vy > 0.5) {
      scaleY = freed ? 1.22 : 1.12;
      scaleX = freed ? 0.86 : 0.92;
    } else if (opts.vy < -0.3) {
      scaleY = freed ? 0.84 : 0.9;
      scaleX = freed ? 1.14 : 1.08;
    }
  }
  if (anim === "happy" || anim === "wave") {
    scaleY = 1 + Math.sin(t * 10) * (freed ? 0.06 : 0.04);
    scaleX = 1 - Math.sin(t * 10) * (freed ? 0.03 : 0.02);
  }
  if (freed && anim === "surprised") {
    scaleY = 1.08 + Math.sin(t * 16) * 0.03;
    scaleX = 0.94;
  }

  blinkTimer += 1 / 60;
  if (blinkPhase === 0 && blinkTimer > (freed ? 2 : 3) + Math.random() * 2) {
    blinkPhase = 1;
    blinkTimer = 0;
  }
  let blink = 0;
  if (blinkPhase === 1) {
    blink = Math.min(1, blinkTimer * 12);
    if (blink >= 1) {
      blinkPhase = 2;
      blinkTimer = 0;
    }
  } else if (blinkPhase === 2) {
    blink = 1;
    if (blinkTimer > 0.06) {
      blinkPhase = 3;
      blinkTimer = 0;
    }
  } else if (blinkPhase === 3) {
    blink = 1 - Math.min(1, blinkTimer * 10);
    if (blink <= 0) {
      blinkPhase = 0;
      blinkTimer = 0;
      blink = 0;
    }
  }
  if (anim === "sleep") blink = 1;

  const headYaw = opts.lookX * (freed ? 0.48 : 0.35);
  const headPitch =
    opts.lookY * (freed ? 0.28 : 0.2) +
    motion.headDroop +
    (anim === "think" ? 0.12 : 0) -
    (anim === "point" ? 0.08 : 0);

  const tipPulse =
    0.45 +
    motion.glow * 0.4 +
    Math.sin(t * (freed ? 5 : 3)) * (freed ? 0.14 : 0.08) +
    (opts.phase === "home" ? 0.05 : 0.12);

  return {
    scaleY,
    scaleX,
    bob: breath + sway + walkBob,
    headPitch,
    headYaw,
    blink,
    tipPulse,
  };
}
