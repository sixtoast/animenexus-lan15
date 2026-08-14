/**
 * Sprint 8 — Micro-behaviours
 *
 * Short autonomous actions selected probabilistically while idle.
 * Cooldowns + context prevent constant random fidgeting.
 *
 * These map onto existing anim layers + expression hints — no new mesh system.
 */

import type { MascotAnim, MascotEmotions, MascotContext } from "./types";
import type { MascotExpression } from "./expression";
import type { MascotIntention } from "./director";
import { COMPANION } from "./personality";
import { bondStage } from "./memory";

export type MicroId =
  | "stretch"
  | "yawn"
  | "look-around"
  | "inspect-floor"
  | "kick-feet"
  | "scratch-head"
  | "fix-collar"
  | "look-at-cursor"
  | "peek-ui"
  | "sit-settle"
  | "practice-pose"
  | "embarrassed-glance"
  | "pretend-busy"
  | "stare-then-look-away"
  | "soft-bounce";

export type MicroBehaviour = {
  id: MicroId;
  /** Weight when eligible (higher = more likely) */
  weight: number;
  /** Min ms between repeats of this id */
  cooldownMs: number;
  /** How long the micro holds anim/expression */
  durationMs: number;
  anim: MascotAnim;
  expression?: MascotExpression;
  /** Optional head/look bias nudge */
  lookBias?: { x: number; y: number };
  /** Soft thought line (rare) */
  thought?: string;
};

const LIBRARY: MicroBehaviour[] = [
  {
    id: "stretch",
    weight: 1.1,
    cooldownMs: 28_000,
    durationMs: 1600,
    anim: "think",
    expression: "neutral",
    thought: "Stretch…",
  },
  {
    id: "yawn",
    weight: 0.9,
    cooldownMs: 35_000,
    durationMs: 1800,
    anim: "think",
    expression: "sleepy",
  },
  {
    id: "look-around",
    weight: 1.4,
    cooldownMs: 14_000,
    durationMs: 1200,
    anim: "idle",
    expression: "curious",
    lookBias: { x: 0.6, y: -0.1 },
  },
  {
    id: "inspect-floor",
    weight: 0.8,
    cooldownMs: 22_000,
    durationMs: 1400,
    anim: "think",
    expression: "focused",
    lookBias: { x: 0, y: 0.55 },
  },
  {
    id: "kick-feet",
    weight: 0.7,
    cooldownMs: 20_000,
    durationMs: 900,
    anim: "happy",
    expression: "mischievous",
  },
  {
    id: "scratch-head",
    weight: 0.85,
    cooldownMs: 24_000,
    durationMs: 1100,
    anim: "think",
    expression: "confused",
  },
  {
    id: "fix-collar",
    weight: 0.6,
    cooldownMs: 40_000,
    durationMs: 1000,
    anim: "idle",
    expression: "focused",
  },
  {
    id: "look-at-cursor",
    weight: 1.2,
    cooldownMs: 12_000,
    durationMs: 900,
    anim: "point",
    expression: "curious",
  },
  {
    id: "peek-ui",
    weight: 1.0,
    cooldownMs: 18_000,
    durationMs: 1300,
    anim: "point",
    expression: "curious",
    lookBias: { x: -0.4, y: -0.2 },
  },
  {
    id: "sit-settle",
    weight: 0.75,
    cooldownMs: 30_000,
    durationMs: 1500,
    anim: "idle",
    expression: "neutral",
  },
  {
    id: "practice-pose",
    weight: 0.55,
    cooldownMs: 45_000,
    durationMs: 1400,
    anim: "wave",
    expression: "proud",
  },
  {
    id: "embarrassed-glance",
    weight: 0.7,
    cooldownMs: 26_000,
    durationMs: 1000,
    anim: "idle",
    expression: "embarrassed",
    lookBias: { x: 0.5, y: 0.2 },
  },
  {
    id: "pretend-busy",
    weight: 0.65,
    cooldownMs: 32_000,
    durationMs: 1600,
    anim: "think",
    expression: "focused",
  },
  {
    id: "stare-then-look-away",
    weight: 0.8,
    cooldownMs: 20_000,
    durationMs: 1100,
    anim: "idle",
    expression: "curious",
    lookBias: { x: 0, y: -0.3 },
  },
  {
    id: "soft-bounce",
    weight: 0.7,
    cooldownMs: 25_000,
    durationMs: 700,
    anim: "jump",
    expression: "happy",
  },
];

/** Per-id last fire times (module state; fine for single-mascot client). */
const lastFired = new Map<MicroId, number>();
let lastAnyMicroAt = 0;

/** Global gap between any two micros */
const GLOBAL_GAP_MS = 8_000;

export type MicroContext = {
  emotions: MascotEmotions;
  context: MascotContext;
  intention: MascotIntention;
  busy: boolean;
  hasTarget: boolean;
  anim: MascotAnim;
  /** Cursor proximity 0 far … 1 near (optional) */
  cursorNear?: number;
};

function isEligible(m: MicroBehaviour, ctx: MicroContext, now: number): boolean {
  if (ctx.busy) return false;
  if (ctx.hasTarget) return false;
  if (ctx.anim === "sleep" || ctx.anim === "jump" || ctx.anim === "walk") return false;
  if (ctx.intention === "sleep" || ctx.intention === "celebrate" || ctx.intention === "play")
    return false;

  const last = lastFired.get(m.id) ?? 0;
  if (now - last < m.cooldownMs) return false;
  if (now - lastAnyMicroAt < GLOBAL_GAP_MS) return false;

  const e = ctx.emotions;
  const t = COMPANION.traits;

  switch (m.id) {
    case "yawn":
      return e.sleepiness > 0.4 || e.energy < 0.4;
    case "stretch":
      return e.energy < 0.55 || e.boredom > 0.3;
    case "look-around":
      return e.curiosity > 0.35 || e.boredom > 0.25;
    case "inspect-floor":
      return e.curiosity > 0.4 && e.attention < 0.6;
    case "kick-feet":
      return t.playfulness > 0.4 && e.energy > 0.45;
    case "scratch-head":
      return e.boredom > 0.35 || ctx.context === "empty-list";
    case "fix-collar":
      return e.attention < 0.5 && e.stress < 0.4;
    case "look-at-cursor":
      return (ctx.cursorNear ?? 0) > 0.35 && e.curiosity > 0.3;
    case "peek-ui":
      return (
        (ctx.context === "browsing" || ctx.intention === "inspect-recommendation") &&
        e.curiosity > 0.4
      );
    case "sit-settle":
      return e.energy < 0.5 && e.stress < 0.45;
    case "practice-pose":
      return t.playfulness > 0.45 && e.happiness > 0.5 && bondStage() !== "stranger";
    case "embarrassed-glance":
      return t.shyness > 0.5 && (ctx.cursorNear ?? 0) > 0.5;
    case "pretend-busy":
      return e.boredom > 0.4 || ctx.context === "loading";
    case "stare-then-look-away":
      return (ctx.cursorNear ?? 0) > 0.55 && t.shyness > 0.4;
    case "soft-bounce":
      return e.happiness > 0.6 && e.energy > 0.55 && t.enthusiasm > 0.45;
    default:
      return true;
  }
}

function weightFor(m: MicroBehaviour, ctx: MicroContext): number {
  let w = m.weight;
  const e = ctx.emotions;
  const t = COMPANION.traits;

  if (m.id === "yawn" || m.id === "stretch") w *= 0.7 + e.sleepiness * 0.8;
  if (m.id === "look-around" || m.id === "peek-ui") w *= 0.6 + t.curiosity * 0.7;
  if (m.id === "kick-feet" || m.id === "soft-bounce") w *= 0.5 + t.playfulness * 0.8;
  if (m.id === "embarrassed-glance" || m.id === "stare-then-look-away")
    w *= 0.5 + t.shyness * 0.9;
  if (m.id === "pretend-busy") w *= 0.6 + e.boredom * 0.7;

  return Math.max(0.05, w);
}

/**
 * Pick a micro-behaviour or null if none should fire.
 * Call from ambient tick when the mascot is mostly idle.
 */
export function pickMicroBehaviour(ctx: MicroContext): MicroBehaviour | null {
  const now = Date.now();
  if (ctx.busy || ctx.hasTarget) return null;

  // Low base chance so micros feel occasional, not constant
  const fireChance =
    0.18 +
    ctx.emotions.boredom * 0.12 +
    COMPANION.traits.playfulness * 0.08 -
    ctx.emotions.sleepiness * 0.08;
  if (Math.random() > fireChance) return null;

  const eligible = LIBRARY.filter((m) => isEligible(m, ctx, now));
  if (!eligible.length) return null;

  const weighted = eligible.map((m) => ({ m, w: weightFor(m, ctx) }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const { m, w } of weighted) {
    r -= w;
    if (r <= 0) return m;
  }
  return weighted[weighted.length - 1]?.m ?? null;
}

export function markMicroFired(id: MicroId) {
  const now = Date.now();
  lastFired.set(id, now);
  lastAnyMicroAt = now;
}

/** Reset cooldowns (tests / debug). */
export function resetMicroCooldowns() {
  lastFired.clear();
  lastAnyMicroAt = 0;
}
