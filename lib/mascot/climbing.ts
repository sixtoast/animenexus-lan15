/**
 * Sprint 14 — Climbing system
 *
 * Believable geometry interaction, not teleport:
 * approach → anticipate → jump → grab → pull-up → balance → sit
 * dismount / fall → recovery
 *
 * Sprint 15 safety hooks: only climbable + visible + open platforms.
 */

import type { MascotAnim } from "./types";
import type { Landmark } from "./ui-registry";
import {
  landmarkToHabitat,
  preferredPoint,
  listLandmarks,
  refreshLandmarkRects,
} from "./ui-registry";
import { clampToHabitat, distXZ, type NavTarget } from "./navigation";

export type ClimbPhase =
  | "idle"
  | "approach"
  | "anticipate"
  | "jump"
  | "grab"
  | "pull-up"
  | "balance"
  | "sit"
  | "dismount"
  | "fall"
  | "recover";

export type ClimbState = {
  phase: ClimbPhase;
  landmarkId: string | null;
  surface: { x: number; z: number } | null;
  startedAt: number;
  phaseUntil: number;
};

export const IDLE_CLIMB: ClimbState = {
  phase: "idle",
  landmarkId: null,
  surface: null,
  startedAt: 0,
  phaseUntil: 0,
};

export type ClimbStep = {
  phase: ClimbPhase;
  durationMs: number;
  anim: MascotAnim;
  force?: boolean;
  jump?: boolean;
  target?: NavTarget | null;
  lookClient?: { x: number; y: number };
  thought?: string;
};

/** Safety: platform must be climbable, visible, open, on-screen, large enough */
export function isSafeClimbTarget(lm: Landmark): boolean {
  if (!lm.climbable || !lm.visible || !lm.open) return false;
  if (!lm.rect) return false;
  const r = lm.rect;
  if (r.width < 64 || r.height < 48) return false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Must be substantially on-screen
  if (r.bottom < 40 || r.top > vh - 40) return false;
  if (r.right < 40 || r.left > vw - 40) return false;
  // Reject near-invisible / zero opacity is handled at registration time
  return true;
}

export function pickClimbTarget(
  preferId?: string,
): Landmark | null {
  refreshLandmarkRects();
  const all = listLandmarks().filter(isSafeClimbTarget);
  if (!all.length) return null;
  if (preferId) {
    const hit = all.find((l) => l.id === preferId);
    if (hit) return hit;
  }
  // Prefer cards / modals / hero by score
  let best: Landmark | null = null;
  let bestScore = -Infinity;
  for (const lm of all) {
    const typeBonus =
      lm.type === "modal"
        ? 30
        : lm.type === "card" || lm.type === "hero"
          ? 20
          : lm.type === "rail" || lm.type === "carousel"
            ? 12
            : 0;
    const score = lm.priority * 10 + lm.importance * 20 + typeBonus;
    if (score > bestScore) {
      bestScore = score;
      best = lm;
    }
  }
  return best;
}

function edgeHabitat(lm: Landmark): NavTarget | null {
  // Approach from below / side of surface
  const edge = landmarkToHabitat(lm, "edge");
  const top = landmarkToHabitat(lm, "top");
  const center = landmarkToHabitat(lm, "center");
  const base = edge ?? top ?? center;
  if (!base) return null;
  // Stand slightly in front of surface
  return clampToHabitat(base.x * 0.9, Math.min(base.z + 0.06, 0.22));
}

function surfaceHabitat(lm: Landmark): NavTarget | null {
  const kind =
    lm.type === "modal"
      ? "header"
      : lm.type === "card" || lm.type === "hero"
        ? "top"
        : "center";
  const hab = landmarkToHabitat(lm, kind);
  if (!hab) return null;
  return clampToHabitat(hab.x * 0.85, hab.z * 0.85);
}

function lookOf(lm: Landmark, kind: "edge" | "top" | "header" | "center") {
  const p = preferredPoint(lm, kind);
  return p ? { x: p.clientX, y: p.clientY } : undefined;
}

/** Build full climb sequence for a landmark */
export function planClimb(lm: Landmark): ClimbStep[] | null {
  if (!isSafeClimbTarget(lm)) return null;
  const approach = edgeHabitat(lm);
  const surface = surfaceHabitat(lm);
  if (!approach || !surface) return null;

  const steps: ClimbStep[] = [
    {
      phase: "approach",
      durationMs: 700,
      anim: "walk",
      target: approach,
      lookClient: lookOf(lm, "edge"),
      thought: "Up there…",
    },
    {
      phase: "anticipate",
      durationMs: 280,
      anim: "idle",
      target: approach,
      lookClient: lookOf(lm, "top"),
      thought: "Ready.",
    },
    {
      phase: "jump",
      durationMs: 420,
      anim: "jump",
      force: true,
      jump: true,
      target: surface,
      lookClient: lookOf(lm, "top"),
    },
    {
      phase: "grab",
      durationMs: 220,
      anim: "point",
      force: true,
      target: surface,
      lookClient: lookOf(lm, "header"),
      thought: "Got it.",
    },
    {
      phase: "pull-up",
      durationMs: 380,
      anim: "jump",
      force: true,
      jump: true,
      target: surface,
    },
    {
      phase: "balance",
      durationMs: 450,
      anim: "idle",
      target: surface,
      thought: "Steady…",
    },
    {
      phase: "sit",
      durationMs: 1800,
      anim: "think",
      target: surface,
      lookClient: lookOf(lm, "center"),
      thought: lm.type === "modal" ? "Nice view." : "Comfy.",
    },
  ];
  return steps;
}

/** Dismount back toward home / habitat center */
export function planDismount(from: NavTarget | null): ClimbStep[] {
  const home = clampToHabitat(0.28, 0.1);
  const mid = from
    ? clampToHabitat((from.x + home.x) / 2, (from.z + home.z) / 2)
    : home;
  return [
    {
      phase: "dismount",
      durationMs: 350,
      anim: "jump",
      force: true,
      jump: true,
      target: mid,
      thought: "Down.",
    },
    {
      phase: "recover",
      durationMs: 500,
      anim: "idle",
      target: home,
    },
  ];
}

/** Fall recovery if climb aborted mid-air */
export function planFall(from: NavTarget | null): ClimbStep[] {
  const home = clampToHabitat(0.3, 0.08);
  return [
    {
      phase: "fall",
      durationMs: 300,
      anim: "surprised",
      force: true,
      target: from ? clampToHabitat(from.x, from.z * 0.5) : home,
      thought: "Whoa—",
    },
    {
      phase: "recover",
      durationMs: 600,
      anim: "idle",
      target: home,
    },
  ];
}

export type ClimbRunner = {
  setTarget: (t: NavTarget | null) => void;
  requestAnim: (req: {
    anim: MascotAnim;
    holdMs?: number;
    force?: boolean;
  }) => boolean;
  setLookBias: (b: { x: number; y: number }) => void;
  setJump: () => void;
  setThought: (t: string) => void;
  setClimbState: (s: ClimbState) => void;
  getPosition: () => NavTarget;
};

let activeTimers: number[] = [];

function clearClimbTimers() {
  for (const id of activeTimers) window.clearTimeout(id);
  activeTimers = [];
}

/**
 * Execute a climb plan. Returns total ms and aborts previous climb timers.
 */
export function executeClimb(
  lm: Landmark,
  runner: ClimbRunner,
): number {
  const steps = planClimb(lm);
  if (!steps) return 0;
  clearClimbTimers();

  const surface = surfaceHabitat(lm);
  let t = 0;
  const startedAt = Date.now();

  for (const step of steps) {
    const delay = t;
    const phaseUntil = startedAt + t + step.durationMs;
    const timer = window.setTimeout(() => {
      runner.setClimbState({
        phase: step.phase,
        landmarkId: lm.id,
        surface,
        startedAt,
        phaseUntil,
      });
      if (step.lookClient) {
        runner.setLookBias({
          x: (step.lookClient.x / window.innerWidth - 0.5) * 2,
          y: (step.lookClient.y / window.innerHeight - 0.5) * 2,
        });
      }
      if (step.target !== undefined) runner.setTarget(step.target);
      if (step.jump) runner.setJump();
      runner.requestAnim({
        anim: step.anim,
        holdMs: step.durationMs,
        force: step.force,
      });
      if (step.thought) runner.setThought(step.thought);
    }, delay);
    activeTimers.push(timer);
    t += step.durationMs;
  }

  // Auto-dismount after sit
  const dismountSteps = planDismount(surface);
  for (const step of dismountSteps) {
    const delay = t;
    const phaseUntil = startedAt + t + step.durationMs;
    const timer = window.setTimeout(() => {
      runner.setClimbState({
        phase: step.phase,
        landmarkId: step.phase === "recover" ? null : lm.id,
        surface: step.phase === "recover" ? null : surface,
        startedAt,
        phaseUntil,
      });
      if (step.target !== undefined) runner.setTarget(step.target);
      if (step.jump) runner.setJump();
      runner.requestAnim({
        anim: step.anim,
        holdMs: step.durationMs,
        force: step.force,
      });
      if (step.thought) runner.setThought(step.thought);
      if (step.phase === "recover") {
        runner.setClimbState({ ...IDLE_CLIMB });
      }
    }, delay);
    activeTimers.push(timer);
    t += step.durationMs;
  }

  return t;
}

/** Abort climb with fall recovery */
export function abortClimb(runner: ClimbRunner): number {
  clearClimbTimers();
  const pos = runner.getPosition();
  const steps = planFall(pos);
  let t = 0;
  const startedAt = Date.now();
  for (const step of steps) {
    const delay = t;
    const timer = window.setTimeout(() => {
      runner.setClimbState({
        phase: step.phase,
        landmarkId: null,
        surface: null,
        startedAt,
        phaseUntil: startedAt + delay + step.durationMs,
      });
      if (step.target) runner.setTarget(step.target);
      runner.requestAnim({
        anim: step.anim,
        holdMs: step.durationMs,
        force: step.force,
      });
      if (step.thought) runner.setThought(step.thought);
      if (step.phase === "recover") {
        runner.setClimbState({ ...IDLE_CLIMB });
      }
    }, delay);
    activeTimers.push(timer);
    t += step.durationMs;
  }
  return t;
}

/** Force return home (Sprint 15 safety) */
export function returnHome(runner: ClimbRunner): void {
  clearClimbTimers();
  const home = clampToHabitat(0.32, 0.08);
  runner.setTarget(home);
  runner.requestAnim({ anim: "walk", force: true });
  runner.setClimbState({ ...IDLE_CLIMB });
  runner.setThought("Home.");
}

export function isClimbing(state: ClimbState): boolean {
  return state.phase !== "idle" && state.phase !== "recover";
}

/** Distance check — only start jump when near approach point */
export function nearEnough(
  pos: NavTarget,
  target: NavTarget,
  radius = 0.12,
): boolean {
  return distXZ(pos.x, pos.z, target.x, target.z) <= radius;
}
