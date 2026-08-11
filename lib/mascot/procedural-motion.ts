/**
 * Sprint 3 — Secondary motion
 *
 * Stylised, non-mechanical motion layered on top of locomotion.
 * Channels are independent so expression + walk + secondary can coexist.
 */

import type { MotionProfile } from "./emotions";
import type { MascotAnim } from "./types";

export type ProceduralPose = {
  scaleY: number;
  scaleX: number;
  bob: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  blink: number;
  tipPulse: number;
  /** Tip / antenna lag (radians) — follows head with delay */
  tipSwayX: number;
  tipSwayZ: number;
  /** Arm base rotations (radians) */
  armLZ: number;
  armLX: number;
  armRZ: number;
  armRX: number;
  /** Foot plant compress 0..1 */
  footPlant: number;
  /** Body lean for weight shift */
  leanX: number;
  leanZ: number;
  /** Torso breathe scale (applied lightly on body group) */
  torsoBreath: number;
};

// Module-level blink state (single companion instance)
let blinkTimer = 0;
let blinkPhase = 0;

// Land recovery spring
let landCompress = 0;
let wasAirborne = false;
let prevVy = 0;

// Tip lag spring (follow-through)
let tipVelX = 0;
let tipVelZ = 0;
let tipPosX = 0;
let tipPosZ = 0;

function softSpring(
  pos: number,
  vel: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): { pos: number; vel: number } {
  const force = (target - pos) * stiffness;
  const newVel = (vel + force * dt) * Math.exp(-damping * dt);
  return { pos: pos + newVel * dt, vel: newVel };
}

export function sampleProcedural(
  t: number,
  anim: MascotAnim,
  motion: MotionProfile,
  opts: {
    onGround: boolean;
    vy: number;
    vx?: number;
    lookX: number;
    lookY: number;
    phase: "home" | "outing" | "returning" | "drag";
    /** Optional fixed timestep for springs; defaults ~1/60 */
    dt?: number;
  },
): ProceduralPose {
  const dt = opts.dt ?? 1 / 60;
  const freed =
    opts.phase === "outing" ||
    opts.phase === "returning" ||
    opts.phase === "drag";
  const vx = opts.vx ?? 0;

  // ── Breath (always on) ──────────────────────────────────────────
  const breathSpeed = anim === "sleep" ? 1.05 : freed ? 2.8 : 2.0;
  const breathAmp =
    (freed ? 0.018 : 0.011) * (anim === "sleep" ? 0.55 : 1) * motion.bobAmp;
  const breath = Math.sin(t * breathSpeed) * breathAmp;
  const torsoBreath = 1 + Math.sin(t * breathSpeed) * (freed ? 0.025 : 0.015);

  // ── Idle sway / weight shift ────────────────────────────────────
  const sway =
    anim === "idle" || anim === "sleep" || anim === "think"
      ? Math.sin(t * (freed ? 2.1 : 1.25)) *
        (freed ? 0.02 : 0.009) *
        motion.bobAmp
      : freed
        ? Math.sin(t * 2.8) * 0.012
        : Math.sin(t * 1.6) * 0.006;

  const leanZ =
    Math.sin(t * (freed ? 1.7 : 1.1)) * (freed ? 0.04 : 0.02) +
    THREE_clamp(vx * 0.08, -0.12, 0.12);
  const leanX =
    Math.sin(t * 0.9 + 1.2) * 0.015 +
    (anim === "think" ? 0.04 : 0);

  // ── Walk bob + foot plant ───────────────────────────────────────
  let walkBob = 0;
  let footPlant = 0;
  if (anim === "walk" && opts.onGround) {
    const freq = freed ? 13 : 9.5;
    const phase = t * freq;
    walkBob = Math.abs(Math.sin(phase)) * (freed ? 0.04 : 0.026) * motion.bobAmp;
    // Plant impulse near zero-cross of sin (foot down)
    const plant = Math.pow(Math.max(0, Math.cos(phase)), 4);
    footPlant = plant * (freed ? 0.55 : 0.35);
  }

  // ── Squash / stretch + land recovery ────────────────────────────
  let scaleY = 1;
  let scaleX = 1;

  // Detect landing: was airborne, now grounded, had downward velocity
  if (!opts.onGround) {
    wasAirborne = true;
  } else if (wasAirborne) {
    wasAirborne = false;
    if (prevVy < -0.2) {
      landCompress = Math.min(1, 0.35 + Math.abs(prevVy) * 0.25);
    }
  }
  prevVy = opts.vy;

  // Decay land compress with slight overshoot recovery
  if (landCompress > 0.001) {
    landCompress *= Math.exp(-dt * 6.5);
    if (landCompress < 0.02) landCompress = 0;
  }

  if (anim === "jump" || !opts.onGround) {
    if (opts.vy > 0.4) {
      // Stretch up
      scaleY = freed ? 1.2 : 1.1;
      scaleX = freed ? 0.84 : 0.9;
    } else if (opts.vy < -0.25) {
      // Anticipation / fall squash prep
      scaleY = freed ? 0.88 : 0.92;
      scaleX = freed ? 1.12 : 1.06;
    }
  }

  // Landing compression (squash then recover toward 1)
  if (landCompress > 0) {
    const c = landCompress;
    scaleY *= 1 - c * 0.22;
    scaleX *= 1 + c * 0.16;
  }

  // Foot plant micro-squash while walking
  if (footPlant > 0) {
    scaleY *= 1 - footPlant * 0.06;
    scaleX *= 1 + footPlant * 0.04;
  }

  if (anim === "happy" || anim === "wave") {
    const bounce = Math.sin(t * 10);
    scaleY = 1 + bounce * (freed ? 0.055 : 0.035);
    scaleX = 1 - bounce * (freed ? 0.028 : 0.018);
  }
  if (freed && anim === "surprised") {
    scaleY = 1.06 + Math.sin(t * 14) * 0.025;
    scaleX = 0.94;
  }
  if (anim === "sleep") {
    scaleY *= 0.96 + breath * 2;
    scaleX *= 1.02;
  }

  // ── Blink ───────────────────────────────────────────────────────
  blinkTimer += dt;
  if (blinkPhase === 0 && blinkTimer > (freed ? 2.2 : 3.2) + Math.random() * 2.4) {
    blinkPhase = 1;
    blinkTimer = 0;
  }
  let blink = 0;
  if (blinkPhase === 1) {
    blink = Math.min(1, blinkTimer * 14);
    if (blink >= 1) {
      blinkPhase = 2;
      blinkTimer = 0;
    }
  } else if (blinkPhase === 2) {
    blink = 1;
    if (blinkTimer > 0.05) {
      blinkPhase = 3;
      blinkTimer = 0;
    }
  } else if (blinkPhase === 3) {
    blink = 1 - Math.min(1, blinkTimer * 11);
    if (blink <= 0) {
      blinkPhase = 0;
      blinkTimer = 0;
      blink = 0;
    }
  }
  if (anim === "sleep") blink = 1;

  // ── Head ────────────────────────────────────────────────────────
  const headYaw = opts.lookX * (freed ? 0.48 : 0.32);
  const headPitch =
    opts.lookY * (freed ? 0.28 : 0.18) +
    motion.headDroop +
    (anim === "think" ? 0.14 : 0) -
    (anim === "point" ? 0.08 : 0) +
    breath * 0.4;
  // "curious" is an expression, not MascotAnim — use think for head roll bias
  const headRoll =
    Math.sin(t * 1.3) * 0.02 + (anim === "think" ? 0.06 : 0);

  // ── Tip lag (spring follow-through on head motion) ──────────────
  const tipTargetX = headPitch * 0.35 + Math.sin(t * 2.4) * 0.06;
  const tipTargetZ = headYaw * 0.25 + Math.sin(t * 1.9 + 0.5) * 0.05;
  const tipSpringX = softSpring(tipPosX, tipVelX, tipTargetX, 28, 9, dt);
  const tipSpringZ = softSpring(tipPosZ, tipVelZ, tipTargetZ, 28, 9, dt);
  tipPosX = tipSpringX.pos;
  tipVelX = tipSpringX.vel;
  tipPosZ = tipSpringZ.pos;
  tipVelZ = tipSpringZ.vel;

  const tipPulse =
    0.42 +
    motion.glow * 0.42 +
    Math.sin(t * (freed ? 4.8 : 2.8)) * (freed ? 0.13 : 0.07) +
    (opts.phase === "home" ? 0.04 : 0.1);

  // ── Arms (secondary + anim-driven) ──────────────────────────────
  const armAmp = motion.armAmp * (freed ? 1.15 : 0.85);
  let armLZ = 0.32;
  let armLX = 0.08;
  let armRZ = -0.32;
  let armRX = 0.08;

  if (anim === "walk" && opts.onGround) {
    const swing = Math.sin(t * (freed ? 13 : 9.5)) * 0.38 * armAmp;
    armLZ = 0.28 + swing;
    armRZ = -0.28 - swing;
    armLX = 0.12 + Math.abs(swing) * 0.15;
    armRX = 0.12 + Math.abs(swing) * 0.15;
  } else if (anim === "wave") {
    armLZ = 0.15;
    armLX = -0.85 + Math.sin(t * 11) * 0.55;
    armRZ = -0.25 + Math.sin(t * 1.5) * 0.05;
    armRX = 0.1;
  } else if (anim === "point") {
    armLZ = 0.25;
    armLX = 0.1;
    armRZ = -0.1;
    armRX = -0.55;
  } else if (anim === "happy" || anim === "jump") {
    const up = Math.sin(t * 9) * 0.25;
    armLZ = 0.5 + up;
    armRZ = -0.5 - up;
    armLX = -0.25;
    armRX = -0.25;
  } else if (anim === "sleep") {
    armLZ = 0.55;
    armRZ = -0.55;
    armLX = 0.35;
    armRX = 0.35;
  } else {
    // Idle settle — soft counter-phase breathe
    const idleSwing = Math.sin(t * 1.35) * 0.07 * armAmp;
    armLZ = 0.3 + idleSwing;
    armRZ = -0.3 - idleSwing;
    armLX = 0.1 + breath * 2;
    armRX = 0.1 + breath * 2;
  }

  return {
    scaleY,
    scaleX,
    bob: breath + sway + walkBob - landCompress * 0.04,
    headPitch,
    headYaw,
    headRoll,
    blink,
    tipPulse,
    tipSwayX: tipPosX,
    tipSwayZ: tipPosZ,
    armLZ,
    armLX,
    armRZ,
    armRX,
    footPlant,
    leanX,
    leanZ,
    torsoBreath,
  };
}

function THREE_clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
