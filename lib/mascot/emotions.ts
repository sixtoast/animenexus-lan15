import type { MascotEmotions } from "./types";
import { personalityEmotionSeed } from "./personality";

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Baseline from Lantern-ko traits + time of day */
export function defaultEmotions(): MascotEmotions {
  return personalityEmotionSeed();
}

/** Continuous drift toward a calm living baseline. */
export function decayEmotions(
  e: MascotEmotions,
  dtSec: number,
): MascotEmotions {
  const d = { ...e };
  d.attention = clamp(d.attention - 0.012 * dtSec);
  d.boredom = clamp(d.boredom + 0.009 * dtSec);
  d.sleepiness = clamp(d.sleepiness + 0.007 * dtSec);
  d.energy = clamp(d.energy - 0.005 * dtSec);
  d.happiness = clamp(d.happiness - 0.004 * dtSec);
  d.curiosity = clamp(d.curiosity - 0.003 * dtSec);
  d.confidence = clamp(d.confidence + 0.002 * dtSec);
  d.stress = clamp(d.stress - 0.008 * dtSec);
  return d;
}

export type MotionProfile = {
  walkSpeed: number;
  bobAmp: number;
  armAmp: number;
  poseOpenness: number;
  glow: number;
  headDroop: number;
  jitter: number;
};

export function motionFromEmotions(e: MascotEmotions): MotionProfile {
  const tired = e.sleepiness * 0.6 + (1 - e.energy) * 0.4;
  return {
    walkSpeed: 0.35 + e.energy * 0.55 - e.stress * 0.1,
    bobAmp: 0.7 + e.energy * 0.5 - tired * 0.35,
    armAmp: 0.65 + e.energy * 0.45 + e.happiness * 0.2,
    poseOpenness: 0.5 + e.confidence * 0.4 - e.stress * 0.35,
    glow: 0.25 + e.happiness * 0.55 + e.attention * 0.15,
    headDroop: tired * 0.35 + e.stress * 0.1,
    jitter: e.stress * 0.04,
  };
}
