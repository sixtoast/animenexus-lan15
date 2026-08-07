import type { MascotAnim, MascotEmotions } from "./types";

/**
 * Random ambient performances — low duty cycle, never during busy/celebrate.
 */
export type SkitId =
  | "stretch"
  | "yawn"
  | "read"
  | "dance"
  | "binoculars"
  | "spin-peek";

export type Skit = {
  id: SkitId;
  anim: MascotAnim;
  holdMs: number;
  /** Optional second beat */
  follow?: { anim: MascotAnim; holdMs: number };
  weight: number;
};

const SKITS: Skit[] = [
  {
    id: "stretch",
    anim: "jump",
    holdMs: 350,
    follow: { anim: "idle", holdMs: 0 },
    weight: 1.2,
  },
  {
    id: "yawn",
    anim: "think",
    holdMs: 2200,
    weight: 1.0,
  },
  {
    id: "read",
    anim: "think",
    holdMs: 4000,
    weight: 0.9,
  },
  {
    id: "dance",
    anim: "happy",
    holdMs: 1600,
    weight: 0.7,
  },
  {
    id: "binoculars",
    anim: "point",
    holdMs: 1800,
    follow: { anim: "think", holdMs: 1200 },
    weight: 0.8,
  },
  {
    id: "spin-peek",
    anim: "wave",
    holdMs: 1000,
    weight: 0.6,
  },
];

/** Bias skit weights from current emotions. */
export function pickSkit(emotions: MascotEmotions): Skit | null {
  const weighted = SKITS.map((s) => {
    let w = s.weight;
    if (s.id === "yawn" || s.id === "read") {
      w *= 0.6 + emotions.sleepiness + emotions.boredom * 0.5;
    }
    if (s.id === "dance" || s.id === "stretch") {
      w *= 0.5 + emotions.energy * 0.9 + emotions.happiness * 0.4;
    }
    if (s.id === "binoculars") {
      w *= 0.5 + emotions.curiosity;
    }
    if (s.id === "spin-peek") {
      w *= 0.4 + emotions.attention * 0.8;
    }
    return { s, w: Math.max(0.05, w) };
  });

  const total = weighted.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total;
  for (const item of weighted) {
    r -= item.w;
    if (r <= 0) return item.s;
  }
  return weighted[0]?.s ?? null;
}

/** Min gap between skits (ms). */
export const SKIT_COOLDOWN_MS = 28_000;

/** Chance to attempt a skit when the ambient timer fires. */
export const SKIT_CHANCE = 0.32;
