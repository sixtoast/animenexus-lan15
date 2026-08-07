/**
 * Utility AI — score goals instead of rigid if/else (Sprint M9).
 */

import type { MascotEmotions } from "./types";
import type { MascotGoal } from "./behaviour";
import { bondStage, getMemory } from "./memory";
import { dayPart } from "./personality";

export type UtilityContext = {
  emotions: MascotEmotions;
  msSinceInteract: number;
  currentGoal: MascotGoal;
  busy: boolean;
  modalOpen?: boolean;
};

export type ScoredGoal = {
  goal: MascotGoal;
  score: number;
  reason: string;
};

type Scorer = (ctx: UtilityContext) => ScoredGoal;

const scorers: Scorer[] = [
  (ctx) => {
    const { sleepiness, energy } = ctx.emotions;
    const night = ["night", "late"].includes(dayPart());
    let score = sleepiness * 0.7 + (1 - energy) * 0.4;
    if (night) score += 0.2;
    if (sleepiness < 0.4) score *= 0.3;
    return { goal: "nap", score, reason: night ? "night rest" : "tired" };
  },
  (ctx) => {
    const { stress, confidence } = ctx.emotions;
    let score = stress * 0.85 - confidence * 0.2;
    if (stress < 0.35) score *= 0.25;
    return { goal: "ponder", score, reason: "settle nerves" };
  },
  (ctx) => {
    const { attention, boredom } = ctx.emotions;
    const stage = bondStage(getMemory());
    const lonely =
      stage === "close" ? 35_000 : stage === "stranger" ? 65_000 : 50_000;
    let score = 0;
    if (ctx.msSinceInteract > lonely) {
      score =
        0.45 +
        (1 - attention) * 0.35 +
        boredom * 0.15 +
        (stage === "close" ? 0.15 : 0);
    }
    return { goal: "seek-attention", score, reason: "desk quiet too long" };
  },
  (ctx) => {
    const { curiosity, energy, boredom, confidence } = ctx.emotions;
    let score =
      boredom * 0.35 + curiosity * 0.35 + energy * 0.2 + confidence * 0.1;
    if (ctx.modalOpen) score += 0.15;
    if (energy < 0.3) score *= 0.4;
    if (ctx.currentGoal === "wander") score *= 0.85;
    return { goal: "wander", score, reason: "explore signals" };
  },
  (ctx) => {
    const { happiness, energy } = ctx.emotions;
    let score = 0;
    if (happiness > 0.8 && ctx.msSinceInteract < 12_000) {
      score = happiness * 0.5 + energy * 0.2;
    }
    return { goal: "celebrate", score, reason: "afterglow" };
  },
  (ctx) => {
    const { happiness, stress, boredom } = ctx.emotions;
    let score = 0.22 + happiness * 0.15 - boredom * 0.1 - stress * 0.05;
    if (ctx.currentGoal === "idle") score += 0.05;
    return { goal: "idle", score, reason: "content baseline" };
  },
];

export function pickUtilityGoal(ctx: UtilityContext): ScoredGoal | null {
  if (ctx.busy) return null;
  const ranked = scorers
    .map((fn) => fn(ctx))
    .map((s) => ({
      ...s,
      score: Math.max(0, s.score + (Math.random() - 0.5) * 0.04),
    }))
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const best = ranked[0];
  if (
    best.goal === ctx.currentGoal &&
    ctx.currentGoal !== "wander" &&
    best.score < 0.55
  ) {
    return { goal: ctx.currentGoal, score: best.score, reason: "hold" };
  }
  if (best.goal !== "idle" && best.score < 0.28) {
    return ranked.find((g) => g.goal === "idle") ?? best;
  }
  return best;
}

export function utilityCooldownMs(picked: ScoredGoal): number {
  switch (picked.goal) {
    case "nap":
      return 12_000;
    case "ponder":
      return 8_000;
    case "seek-attention":
      return 10_000;
    case "wander":
      return 5_000;
    case "celebrate":
      return 6_000;
    default:
      return 5_000;
  }
}
