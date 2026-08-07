/**
 * Sprint 3 — Procedural motion helpers (squash, breath, look, blink).
 * Pure functions; renderer samples each frame.
 */

import type { MotionProfile } from "./emotions";
import type { MascotAnim } from "./types";

export type ProceduralPose = {
  /** Vertical scale (squash/stretch) */
  scaleY: number;
  scaleX: number;
  /** Body bob */
  bob: number;
  /** Head pitch / yaw extras */
  headPitch: number;
  headYaw: number;
  /** Blink 0 = open, 1 = closed */
  blink: number;
  /** Tip pulse */
  tipPulse: number;
};

let blinkTimer = 0;
let blinkPhase = 0; // 0 open, 1 closing, 2 closed, 3 opening

export function sampleProcedural(
  t: number,
  anim: MascotAnim,
  motion: MotionProfile,
  opts: {
    onGround: boolean;
    vy: number;
    lookX: number; // -1..1
    lookY: number;
    phase: "home" | "outing" | "returning" | "drag";
  },
): ProceduralPose {
  // Breathing
  const breathSpeed = anim === "sleep" ? 1.1 : 2.2;
  const breath = Math.sin(t * breathSpeed) * 0.012 * (anim === "sleep" ? 0.6 : 1);

  // Idle sway
  const sway =
    anim === "idle" || anim === "sleep"
      ? Math.sin(t * 1.3) * 0.01 * motion.bobAmp
      : 0;

  // Walk bob
  const walkBob =
    anim === "walk" && opts.onGround
      ? Math.abs(Math.sin(t * 10)) * 0.028 * motion.bobAmp
      : 0;

  // Jump squash/stretch
  let scaleY = 1;
  let scaleX = 1;
  if (anim === "jump" || !opts.onGround) {
    if (opts.vy > 0.5) {
      // stretch up
      scaleY = 1.12;
      scaleX = 0.92;
    } else if (opts.vy < -0.3) {
      // squash toward land
      scaleY = 0.9;
      scaleX = 1.08;
    }
  }
  if (anim === "happy" || anim === "wave") {
    scaleY = 1 + Math.sin(t * 8) * 0.04;
    scaleX = 1 - Math.sin(t * 8) * 0.02;
  }

  // Blink cycle ~ every 3–5s
  blinkTimer += 1 / 60;
  if (blinkPhase === 0 && blinkTimer > 3 + Math.random() * 2) {
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

  // Look-at bias (head)
  const headYaw = opts.lookX * 0.35;
  const headPitch =
    opts.lookY * 0.2 +
    motion.headDroop +
    (anim === "think" ? 0.12 : 0) -
    (anim === "point" ? 0.08 : 0);

  const tipPulse =
    0.45 + motion.glow * 0.4 + Math.sin(t * 3) * 0.08 +
    (opts.phase === "home" ? 0.05 : 0);

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
