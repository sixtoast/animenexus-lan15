/**
 * Sprint 9 — Cursor relationship
 *
 * Treat the mouse cursor as an object in Lantern-ko's world.
 * Attention depends on distance, speed, recent interaction,
 * personality, curiosity, and current activity — never constant tracking.
 */

import type { MascotEmotions } from "./types";
import type { MascotIntention } from "./director";
import { COMPANION } from "./personality";

export type CursorRelation =
  | "ignore"
  | "notice"
  | "look"
  | "follow"
  | "approach"
  | "avoid"
  | "chase"
  | "wave"
  | "curious"
  | "bored";

export type CursorSample = {
  clientX: number;
  clientY: number;
  t: number;
};

export type CursorWorld = {
  /** Normalized look direction −1…1 */
  lookX: number;
  lookY: number;
  /** 0 far … 1 near (to mascot dock / last known body screen pos) */
  near: number;
  /** px/s smoothed */
  speed: number;
  relation: CursorRelation;
  lastMoveAt: number;
  lastRelationAt: number;
};

export type CursorEvalContext = {
  emotions: MascotEmotions;
  intention: MascotIntention;
  busy: boolean;
  /** Screen-space mascot anchor (dock / body) */
  mascotScreen: { x: number; y: number };
  viewport: { w: number; h: number };
};

const state: {
  prev: CursorSample | null;
  speed: number;
  relation: CursorRelation;
  lastRelationAt: number;
  lastMoveAt: number;
  holdUntil: number;
} = {
  prev: null,
  speed: 0,
  relation: "ignore",
  lastRelationAt: 0,
  lastMoveAt: 0,
  holdUntil: 0,
};

const HOLD_MS: Partial<Record<CursorRelation, number>> = {
  notice: 600,
  look: 900,
  follow: 1200,
  approach: 1500,
  avoid: 1400,
  chase: 1800,
  wave: 1100,
  curious: 1000,
  bored: 2000,
  ignore: 400,
};

function dist(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function nearFactor(
  cursor: CursorSample,
  mascot: { x: number; y: number },
  viewport: { w: number; h: number },
): number {
  const d = dist(cursor.clientX, cursor.clientY, mascot.x, mascot.y);
  // ~280px = fairly near on desktop
  const scale = Math.min(viewport.w, viewport.h) * 0.35;
  return Math.max(0, Math.min(1, 1 - d / Math.max(scale, 120)));
}

/**
 * Feed a pointer sample. Returns updated world snapshot + whether
 * the relation *changed* (caller may dispatch a store reaction).
 */
export function sampleCursor(
  clientX: number,
  clientY: number,
  ctx: CursorEvalContext,
): { world: CursorWorld; changed: boolean } {
  const now = Date.now();
  const sample: CursorSample = { clientX, clientY, t: now };

  if (state.prev) {
    const dt = Math.max(16, now - state.prev.t);
    const d = dist(clientX, clientY, state.prev.clientX, state.prev.clientY);
    const inst = (d / dt) * 1000; // px/s
    state.speed = state.speed * 0.7 + inst * 0.3;
  }
  state.prev = sample;
  state.lastMoveAt = now;

  const near = nearFactor(sample, ctx.mascotScreen, ctx.viewport);
  const lookX = (clientX / ctx.viewport.w - 0.5) * 2;
  const lookY = (clientY / ctx.viewport.h - 0.5) * 2;

  // Hold current relation briefly so we don't thrash
  if (now < state.holdUntil) {
    return {
      world: {
        lookX,
        lookY,
        near,
        speed: state.speed,
        relation: state.relation,
        lastMoveAt: state.lastMoveAt,
        lastRelationAt: state.lastRelationAt,
      },
      changed: false,
    };
  }

  const next = evaluateRelation(near, state.speed, ctx);
  const changed = next !== state.relation;
  if (changed) {
    state.relation = next;
    state.lastRelationAt = now;
    state.holdUntil = now + (HOLD_MS[next] ?? 800);
  }

  return {
    world: {
      lookX,
      lookY,
      near,
      speed: state.speed,
      relation: state.relation,
      lastMoveAt: state.lastMoveAt,
      lastRelationAt: state.lastRelationAt,
    },
    changed,
  };
}

function evaluateRelation(
  near: number,
  speed: number,
  ctx: CursorEvalContext,
): CursorRelation {
  const t = COMPANION.traits;
  const e = ctx.emotions;

  // Don't track while sleeping / celebrating / heavy busy
  if (ctx.busy) return state.relation === "ignore" ? "ignore" : "bored";
  if (ctx.intention === "sleep") return "ignore";
  if (ctx.intention === "celebrate") return "look";

  // Far + slow → ignore or bored
  if (near < 0.12) {
    if (state.relation !== "ignore" && e.attention < 0.4) return "bored";
    return "ignore";
  }

  // Very fast near the body → flinch avoid (shy) or notice
  if (speed > 900 && near > 0.45) {
    return t.shyness > 0.5 || e.stress > 0.4 ? "avoid" : "notice";
  }

  // Playful chase when close + medium speed + energy
  if (
    near > 0.55 &&
    speed > 180 &&
    speed < 700 &&
    t.playfulness > 0.45 &&
    e.energy > 0.45 &&
    e.curiosity > 0.4
  ) {
    return Math.random() < 0.35 ? "chase" : "follow";
  }

  // Approach dock when close and calm
  if (near > 0.65 && speed < 200 && e.curiosity > 0.35 && t.shyness < 0.6) {
    return "approach";
  }

  // Soft wave when lingering near after bond-ish attention
  if (
    near > 0.5 &&
    speed < 80 &&
    e.attention > 0.45 &&
    (t.playfulness > 0.4 || e.happiness > 0.55)
  ) {
    return Math.random() < 0.25 ? "wave" : "look";
  }

  // Curious tilt when moderately near
  if (near > 0.25 && e.curiosity > 0.5) {
    return speed > 120 ? "curious" : "look";
  }

  if (near > 0.2) return "notice";
  return "ignore";
}

/**
 * Map relation → suggested store reaction (anim / intention).
 * Caller applies; this module stays pure data.
 */
export function reactionForRelation(rel: CursorRelation): {
  intention?: MascotIntention;
  anim?: "point" | "wave" | "surprised" | "happy" | "think" | "idle";
  holdMs?: number;
  seekTarget?: boolean;
  flee?: boolean;
} {
  switch (rel) {
    case "notice":
      return { intention: "observe", anim: "idle", holdMs: 400 };
    case "look":
    case "curious":
      return { intention: "interact-ui", anim: "point", holdMs: 800 };
    case "follow":
      return { intention: "interact-ui", anim: "point", holdMs: 600, seekTarget: true };
    case "approach":
      return { intention: "play", anim: "walk" as "idle", holdMs: 0, seekTarget: true };
    case "chase":
      return {
        intention: "play",
        anim: "happy",
        holdMs: 700,
        seekTarget: true,
      };
    case "avoid":
      return { intention: "hide", anim: "surprised", holdMs: 500, flee: true };
    case "wave":
      return { intention: "greet", anim: "wave", holdMs: 900 };
    case "bored":
      return { intention: "idle", anim: "idle" };
    case "ignore":
    default:
      return {};
  }
}

export function getCursorRelation(): CursorRelation {
  return state.relation;
}

/** Decay toward ignore when cursor is still for a while. */
export function tickCursorIdle(stillMs = 2500): CursorRelation {
  const now = Date.now();
  if (now - state.lastMoveAt > stillMs && state.relation !== "ignore") {
    if (now > state.holdUntil) {
      state.relation = "bored";
      state.holdUntil = now + 1500;
    }
  }
  if (now - state.lastMoveAt > stillMs * 2.5) {
    state.relation = "ignore";
    state.speed *= 0.5;
  }
  return state.relation;
}
