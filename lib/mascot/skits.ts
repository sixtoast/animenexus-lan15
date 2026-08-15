/**
 * Sprint 18 — Skits
 *
 * Short 2–8s scripted moments. Legacy single-anim skits kept for compatibility.
 */

import type { MascotAnim, MascotEmotions } from "./types";
import type { MascotIntention } from "./director";
import {
  landmarkToHabitat,
  listByType,
  pickInterestingLandmark,
  preferredPoint,
} from "./ui-registry";
import { clampToHabitat, type NavTarget } from "./navigation";
import { COMPANION } from "./personality";

// ── Legacy single-beat API (still used by older call sites) ───────────────

export type SkitId =
  | "stretch"
  | "yawn"
  | "read"
  | "dance"
  | "binoculars"
  | "spin-peek"
  | "found-something"
  | "almost-fell"
  | "cursor-chase"
  | "caught"
  | "too-much-anime"
  | "desk-patrol";

export type Skit = {
  id: SkitId;
  anim: MascotAnim;
  holdMs: number;
  follow?: { anim: MascotAnim; holdMs: number };
  weight: number;
};

const LEGACY_SKITS: Skit[] = [
  {
    id: "stretch",
    anim: "jump",
    holdMs: 350,
    follow: { anim: "idle", holdMs: 0 },
    weight: 1.2,
  },
  { id: "yawn", anim: "think", holdMs: 2200, weight: 1.0 },
  { id: "read", anim: "think", holdMs: 4000, weight: 0.9 },
  { id: "dance", anim: "happy", holdMs: 1600, weight: 0.7 },
  {
    id: "binoculars",
    anim: "point",
    holdMs: 1800,
    follow: { anim: "think", holdMs: 1200 },
    weight: 0.8,
  },
  { id: "spin-peek", anim: "wave", holdMs: 1000, weight: 0.6 },
];

export function pickSkit(emotions: MascotEmotions): Skit | null {
  const weighted = LEGACY_SKITS.map((s) => {
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

export const SKIT_COOLDOWN_MS = 28_000;
export const SKIT_CHANCE = 0.32;

// ── Sprint 18 multi-step performances ─────────────────────────────────────

export type SkitStep = {
  delayMs: number;
  anim?: MascotAnim;
  holdMs?: number;
  force?: boolean;
  jump?: boolean;
  target?: NavTarget | null;
  lookBias?: { x: number; y: number };
  thought?: string;
};

export type SkitContext = {
  emotions: MascotEmotions;
  intention: MascotIntention;
  busy: boolean;
  hasTarget: boolean;
  cursorNear: number;
  position: NavTarget;
  lookX?: number;
};

export type PerformanceDef = {
  id: SkitId;
  title: string;
  weight: number;
  when: (ctx: SkitContext) => boolean;
  build: (ctx: SkitContext) => SkitStep[] | null;
};

const lastPerfAt = new Map<string, number>();
let lastAnyPerfAt = 0;
const GLOBAL_PERF_COOLDOWN_MS = 35_000;
const PER_PERF_COOLDOWN_MS = 90_000;

function lookCard(
  kind: "thumb" | "center" | "header" = "center",
): { bias: { x: number; y: number }; habitat: NavTarget } | null {
  if (typeof window === "undefined") return null;
  const lm =
    listByType("card").find((l) => l.visible) || pickInterestingLandmark();
  if (!lm) return null;
  const p = preferredPoint(lm, kind);
  const hab = landmarkToHabitat(lm, kind);
  if (!p || !hab) return null;
  return {
    bias: {
      x: (p.clientX / window.innerWidth - 0.5) * 2,
      y: (p.clientY / window.innerHeight - 0.5) * 2,
    },
    habitat: clampToHabitat(hab.x * 0.8, hab.z * 0.8),
  };
}

const PERFORMANCES: PerformanceDef[] = [
  {
    id: "found-something",
    title: "I Found Something",
    weight: 1.3,
    when: (c) =>
      c.emotions.curiosity > 0.4 &&
      ["explore", "investigate", "inspect-recommendation", "idle", "observe"].includes(
        c.intention,
      ),
    build: () => {
      const hit = lookCard("thumb");
      if (!hit) return null;
      return [
        { delayMs: 0, anim: "walk", target: hit.habitat, thought: "Oh—" },
        {
          delayMs: 700,
          anim: "think",
          holdMs: 600,
          lookBias: hit.bias,
          thought: "This one…",
        },
        {
          delayMs: 1400,
          anim: "point",
          holdMs: 1200,
          force: true,
          lookBias: hit.bias,
          thought: "Peek?",
        },
      ];
    },
  },
  {
    id: "almost-fell",
    title: "Almost Fell",
    weight: 0.9,
    when: (c) =>
      c.emotions.energy > 0.4 &&
      ["explore", "play", "investigate"].includes(c.intention),
    build: (c) => {
      const edge = clampToHabitat(c.position.x + 0.12, c.position.z + 0.08);
      const recover = clampToHabitat(c.position.x, c.position.z);
      return [
        {
          delayMs: 0,
          anim: "jump",
          holdMs: 400,
          force: true,
          jump: true,
          target: edge,
          thought: "Hup—",
        },
        {
          delayMs: 450,
          anim: "surprised",
          holdMs: 500,
          force: true,
          thought: "Whoa!",
        },
        {
          delayMs: 1000,
          anim: "point",
          holdMs: 400,
          target: edge,
          thought: "Got the edge.",
        },
        {
          delayMs: 1500,
          anim: "idle",
          holdMs: 600,
          thought: "…embarrassing.",
        },
        {
          delayMs: 2200,
          anim: "jump",
          holdMs: 400,
          force: true,
          jump: true,
          target: recover,
        },
        { delayMs: 2700, anim: "wave", holdMs: 700, thought: "Still here." },
      ];
    },
  },
  {
    id: "cursor-chase",
    title: "Cursor Chase",
    weight: 1.0,
    when: (c) =>
      c.cursorNear > 0.35 &&
      c.emotions.curiosity > 0.35 &&
      COMPANION.traits.playfulness > 0.35,
    build: (c) => {
      const lx = c.lookX ?? 0.3;
      const chase = clampToHabitat(c.position.x - lx * 0.15, c.position.z + 0.06);
      return [
        {
          delayMs: 0,
          anim: "surprised",
          holdMs: 350,
          force: true,
          thought: "A dot!",
        },
        { delayMs: 400, anim: "walk", target: chase, thought: "Come here…" },
        { delayMs: 1200, anim: "point", holdMs: 500 },
        { delayMs: 1800, anim: "think", holdMs: 800, thought: "Gone." },
        { delayMs: 2700, anim: "idle", holdMs: 400 },
      ];
    },
  },
  {
    id: "caught",
    title: "Caught",
    weight: 1.1,
    when: (c) =>
      c.cursorNear > 0.55 &&
      ["idle", "observe", "rest"].includes(c.intention),
    build: () => [
      { delayMs: 0, anim: "idle", holdMs: 400, thought: "…" },
      {
        delayMs: 450,
        anim: "surprised",
        holdMs: 450,
        force: true,
        thought: "Oh.",
      },
      {
        delayMs: 1000,
        anim: "think",
        holdMs: 700,
        thought: "You’re watching.",
      },
      { delayMs: 1800, anim: "wave", holdMs: 900, force: true, thought: "Hi." },
    ],
  },
  {
    id: "too-much-anime",
    title: "Too Much Anime",
    weight: 0.85,
    when: (c) => {
      const cards = listByType("card").filter((l) => l.visible);
      return cards.length >= 4 && c.emotions.curiosity > 0.3;
    },
    build: () => {
      const hit = lookCard("center");
      return [
        {
          delayMs: 0,
          anim: "think",
          holdMs: 700,
          lookBias: hit?.bias,
          thought: "So many…",
        },
        {
          delayMs: 800,
          anim: "surprised",
          holdMs: 600,
          force: true,
          lookBias: hit?.bias,
          thought: "Too many!",
        },
        {
          delayMs: 1500,
          anim: "jump",
          holdMs: 400,
          force: true,
          jump: true,
          thought: "—!",
        },
        {
          delayMs: 2000,
          anim: "idle",
          holdMs: 800,
          thought: "Okay. One at a time.",
        },
      ];
    },
  },
  {
    id: "desk-patrol",
    title: "Desk Patrol",
    weight: 0.8,
    when: (c) =>
      ["explore", "idle", "observe"].includes(c.intention),
    build: (c) => {
      const a = clampToHabitat(c.position.x + 0.1, c.position.z);
      const b = clampToHabitat(c.position.x - 0.08, c.position.z + 0.05);
      return [
        { delayMs: 0, anim: "walk", target: a, thought: "Patrol." },
        { delayMs: 800, anim: "point", holdMs: 500 },
        { delayMs: 1400, anim: "walk", target: b },
        { delayMs: 2200, anim: "happy", holdMs: 600, thought: "All clear." },
      ];
    },
  },
];

export function pickPerformance(ctx: SkitContext): PerformanceDef | null {
  if (ctx.busy) return null;
  if (Date.now() - lastAnyPerfAt < GLOBAL_PERF_COOLDOWN_MS) return null;

  const now = Date.now();
  const candidates = PERFORMANCES.filter((p) => {
    const last = lastPerfAt.get(p.id) ?? 0;
    if (now - last < PER_PERF_COOLDOWN_MS) return false;
    try {
      return p.when(ctx);
    } catch {
      return false;
    }
  });
  if (!candidates.length) return null;

  const total = candidates.reduce((a, p) => a + p.weight, 0);
  let r = Math.random() * total;
  for (const p of candidates) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return candidates[0];
}

export type SkitRunner = {
  setTarget: (t: NavTarget | null) => void;
  requestAnim: (req: {
    anim: MascotAnim;
    holdMs?: number;
    force?: boolean;
  }) => boolean;
  setLookBias: (b: { x: number; y: number }) => void;
  setJump: () => void;
  setThought: (t: string) => void;
};

export function executePerformance(
  perf: PerformanceDef,
  ctx: SkitContext,
  runner: SkitRunner,
): number {
  const steps = perf.build(ctx);
  if (!steps?.length) return 0;

  lastPerfAt.set(perf.id, Date.now());
  lastAnyPerfAt = Date.now();

  let end = 0;
  for (const step of steps) {
    window.setTimeout(() => {
      if (step.lookBias) runner.setLookBias(step.lookBias);
      if (step.target !== undefined) runner.setTarget(step.target);
      if (step.jump) runner.setJump();
      if (step.anim) {
        runner.requestAnim({
          anim: step.anim,
          holdMs: step.holdMs,
          force: step.force,
        });
      }
      if (step.thought) runner.setThought(step.thought);
    }, step.delayMs);
    end = Math.max(end, step.delayMs + (step.holdMs ?? 400));
  }
  return Math.min(end, 8000);
}

/** Rare ambient multi-step skit (~12% when eligible). */
export function tryAmbientPerformance(
  ctx: SkitContext,
  runner: SkitRunner,
): { id: string; ms: number } | null {
  if (Math.random() > 0.12) return null;
  const perf = pickPerformance(ctx);
  if (!perf) return null;
  const ms = executePerformance(perf, ctx, runner);
  if (ms <= 0) return null;
  return { id: perf.id, ms };
}
