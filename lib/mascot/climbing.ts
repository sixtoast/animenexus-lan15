/**
 * Sprint 14 — Climbing system
 * Sprint 6 — Unified on page-world x/y; issued by brain, not Actor AI
 *
 * Phases: approach → anticipate → jump → grab → pull-up → balance → sit
 *         → dismount → recover
 */

import type { MascotAnim } from "./types";
import type { Landmark } from "./ui-registry";
import {
  landmarkToWorld,
  preferredPoint,
  listLandmarks,
  refreshLandmarkRects,
} from "./ui-registry";
import { clampWorld, distWorld, type WorldPoint } from "./world-coords";
import {
  issueMovementCommand,
  clearMovementCommand,
} from "./movement-command";

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
  surface: WorldPoint | null;
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

let climbState: ClimbState = { ...IDLE_CLIMB };

export function getClimbState(): ClimbState {
  return climbState;
}

export function setClimbState(s: ClimbState) {
  climbState = s;
}

export type ClimbStep = {
  phase: ClimbPhase;
  durationMs: number;
  anim: MascotAnim;
  force?: boolean;
  jump?: boolean;
  target?: WorldPoint | null;
  platformId?: string;
  lookClient?: { x: number; y: number };
  thought?: string;
};

export function isSafeClimbTarget(lm: Landmark): boolean {
  if (!lm.climbable || !lm.visible || !lm.open) return false;
  if (!lm.rect) return false;
  const r = lm.rect;
  if (r.width < 64 || r.height < 48) return false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (r.bottom < 40 || r.top > vh - 40) return false;
  if (r.right < 40 || r.left > vw - 40) return false;
  return true;
}

export function pickClimbTarget(preferId?: string): Landmark | null {
  refreshLandmarkRects();
  const all = listLandmarks().filter(isSafeClimbTarget);
  if (!all.length) return null;
  if (preferId) {
    const hit = all.find((l) => l.id === preferId);
    if (hit) return hit;
  }
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

function edgeWorld(lm: Landmark): WorldPoint | null {
  const edge = landmarkToWorld(lm, "edge");
  const top = landmarkToWorld(lm, "top");
  const center = landmarkToWorld(lm, "center");
  const base = edge ?? top ?? center;
  if (!base) return null;
  return clampWorld(base.x * 0.9, Math.min(base.y + 0.06, 0.85));
}

function surfaceWorld(lm: Landmark): WorldPoint | null {
  const kind =
    lm.type === "modal"
      ? "header"
      : lm.type === "card" || lm.type === "hero"
        ? "top"
        : "center";
  const w = landmarkToWorld(lm, kind);
  if (!w) return null;
  return clampWorld(w.x * 0.85, w.y * 0.85);
}

function lookOf(lm: Landmark, kind: "edge" | "top" | "header" | "center") {
  const p = preferredPoint(lm, kind);
  return p ? { x: p.clientX, y: p.clientY } : undefined;
}

export function planClimb(lm: Landmark): ClimbStep[] | null {
  if (!isSafeClimbTarget(lm)) return null;
  const approach = edgeWorld(lm);
  const surface = surfaceWorld(lm);
  if (!approach || !surface) return null;

  return [
    {
      phase: "approach",
      durationMs: 700,
      anim: "walk",
      target: approach,
      platformId: lm.id,
      lookClient: lookOf(lm, "edge"),
      thought: "Up there…",
    },
    {
      phase: "anticipate",
      durationMs: 280,
      anim: "idle",
      target: approach,
      platformId: lm.id,
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
      platformId: lm.id,
      lookClient: lookOf(lm, "top"),
    },
    {
      phase: "grab",
      durationMs: 220,
      anim: "point",
      force: true,
      target: surface,
      platformId: lm.id,
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
      platformId: lm.id,
    },
    {
      phase: "balance",
      durationMs: 450,
      anim: "idle",
      target: surface,
      platformId: lm.id,
      thought: "Steady…",
    },
    {
      phase: "sit",
      durationMs: 1800,
      anim: "think",
      target: surface,
      platformId: lm.id,
      lookClient: lookOf(lm, "center"),
      thought: lm.type === "modal" ? "Nice view." : "Comfy.",
    },
  ];
}

function homePoint(): WorldPoint {
  if (typeof window === "undefined") return { x: 1.05, y: -0.72 };
  const aspect = window.innerWidth / (window.innerHeight || 1);
  return { x: Math.min(aspect * 0.78, 1.32), y: -0.72 };
}

export function planDismount(from: WorldPoint | null): ClimbStep[] {
  const home = homePoint();
  const mid = from
    ? clampWorld((from.x + home.x) / 2, (from.y + home.y) / 2)
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
      platformId: "home-corner",
    },
  ];
}

export function planFall(from: WorldPoint | null): ClimbStep[] {
  const home = homePoint();
  return [
    {
      phase: "fall",
      durationMs: 300,
      anim: "surprised",
      force: true,
      target: from ? clampWorld(from.x, from.y * 0.5) : home,
      thought: "Whoa—",
    },
    {
      phase: "recover",
      durationMs: 600,
      anim: "idle",
      target: home,
      platformId: "home-corner",
    },
  ];
}

export type ClimbRunner = {
  setTarget: (t: WorldPoint | null) => void;
  requestAnim: (req: {
    anim: MascotAnim;
    holdMs?: number;
    force?: boolean;
  }) => boolean;
  setLookBias: (b: { x: number; y: number }) => void;
  setJump: () => void;
  setThought: (t: string) => void;
  getPosition: () => WorldPoint;
};

let activeTimers: number[] = [];

function clearClimbTimers() {
  for (const id of activeTimers) window.clearTimeout(id);
  activeTimers = [];
}

function issueStepMove(step: ClimbStep, reason: string) {
  if (!step.target) return;
  issueMovementCommand({
    target: step.target,
    platformId: step.platformId,
    mode: step.jump ? "jump" : "walk",
    speed: step.jump ? 1.25 : 1,
    urgency: 0.85,
    interruptible: false,
    reason,
    ttlMs: step.durationMs + 4000,
  });
}

/**
 * Execute climb via MovementCommands + phase state.
 * Returns total duration ms.
 */
export function executeClimb(lm: Landmark, runner: ClimbRunner): number {
  const steps = planClimb(lm);
  if (!steps) return 0;
  clearClimbTimers();

  const surface = surfaceWorld(lm);
  let t = 0;
  const startedAt = Date.now();

  for (const step of steps) {
    const delay = t;
    const phaseUntil = startedAt + t + step.durationMs;
    const timer = window.setTimeout(() => {
      setClimbState({
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
      if (step.target !== undefined) {
        runner.setTarget(step.target);
        issueStepMove(step, `climb:${step.phase}`);
      }
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

  const dismountSteps = planDismount(surface);
  for (const step of dismountSteps) {
    const delay = t;
    const phaseUntil = startedAt + t + step.durationMs;
    const timer = window.setTimeout(() => {
      setClimbState({
        phase: step.phase,
        landmarkId: step.phase === "recover" ? null : lm.id,
        surface: step.phase === "recover" ? null : surface,
        startedAt,
        phaseUntil,
      });
      if (step.target !== undefined) {
        runner.setTarget(step.target);
        issueStepMove(step, `climb:${step.phase}`);
      }
      if (step.jump) runner.setJump();
      runner.requestAnim({
        anim: step.anim,
        holdMs: step.durationMs,
        force: step.force,
      });
      if (step.thought) runner.setThought(step.thought);
      if (step.phase === "recover") {
        setClimbState({ ...IDLE_CLIMB });
        clearMovementCommand();
      }
    }, delay);
    activeTimers.push(timer);
    t += step.durationMs;
  }

  return t;
}

export function abortClimb(runner: ClimbRunner): number {
  clearClimbTimers();
  const pos = runner.getPosition();
  const steps = planFall(pos);
  let t = 0;
  const startedAt = Date.now();
  for (const step of steps) {
    const delay = t;
    const timer = window.setTimeout(() => {
      setClimbState({
        phase: step.phase,
        landmarkId: null,
        surface: null,
        startedAt,
        phaseUntil: startedAt + delay + step.durationMs,
      });
      if (step.target) {
        runner.setTarget(step.target);
        issueStepMove(step, `climb:${step.phase}`);
      }
      runner.requestAnim({
        anim: step.anim,
        holdMs: step.durationMs,
        force: step.force,
      });
      if (step.thought) runner.setThought(step.thought);
      if (step.phase === "recover") {
        setClimbState({ ...IDLE_CLIMB });
        clearMovementCommand();
      }
    }, delay);
    activeTimers.push(timer);
    t += step.durationMs;
  }
  return t;
}

export function returnHome(runner: ClimbRunner): void {
  clearClimbTimers();
  const home = homePoint();
  runner.setTarget(home);
  issueMovementCommand({
    target: home,
    platformId: "home-corner",
    mode: "return-home",
    speed: 1.1,
    urgency: 0.9,
    interruptible: true,
    reason: "climb:returnHome",
    ttlMs: 12_000,
  });
  runner.requestAnim({ anim: "walk", force: true });
  setClimbState({ ...IDLE_CLIMB });
  runner.setThought("Home.");
}

export function isClimbing(state: ClimbState = climbState): boolean {
  return state.phase !== "idle" && state.phase !== "recover";
}

export function nearEnough(
  pos: WorldPoint,
  target: WorldPoint,
  radius = 0.18,
): boolean {
  return distWorld(pos.x, pos.y, target.x, target.y) <= radius;
}

/** Brain entry: pick a climbable surface and run the full sequence. */
export function startBrainClimb(
  runner: ClimbRunner,
  preferId?: string,
): number {
  if (isClimbing()) return 0;
  const lm = pickClimbTarget(preferId);
  if (!lm) return 0;
  return executeClimb(lm, runner);
}
