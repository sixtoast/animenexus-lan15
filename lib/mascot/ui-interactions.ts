/**
 * Sprint 11 — Physical UI interactions
 * Sprint 6 — Climb sequences go through lib/mascot/climbing.ts
 */

import type { MascotAnim } from "./types";
import type { MascotIntention } from "./director";
import type { Landmark, LandmarkType, InteractionPoint } from "./ui-registry";
import {
  landmarkToWorld,
  preferredPoint,
  pickInterestingLandmark,
  listByType,
} from "./ui-registry";
import { COMPANION } from "./personality";
import {
  executeClimb,
  isSafeClimbTarget,
  type ClimbRunner,
} from "./climbing";
import type { WorldPoint } from "./world-coords";

export type StepTarget = { x: number; y?: number; z?: number };

export type UiInteractStep = {
  habitat?: StepTarget | null;
  anim?: MascotAnim;
  holdMs?: number;
  jump?: boolean;
  lookClient?: { x: number; y: number };
  thought?: string;
  delayMs?: number;
};

export type UiInteractPlan = {
  landmarkId: string;
  type: LandmarkType;
  label: string;
  steps: UiInteractStep[];
  totalMs: number;
  /** When set, execute via climbing module instead of step list */
  climbLandmark?: Landmark;
};

const lastPlanAt = new Map<string, number>();
const GLOBAL_COOLDOWN_MS = 14_000;

function axisY(p: StepTarget): number {
  if (typeof p.y === "number") return p.y;
  if (typeof p.z === "number") return p.z;
  return 0;
}

function pointToWorld(
  lm: Landmark,
  kind: InteractionPoint["kind"],
): WorldPoint | null {
  return landmarkToWorld(lm, kind);
}

function clientOf(
  lm: Landmark,
  kind: InteractionPoint["kind"],
): { x: number; y: number } | null {
  const p = preferredPoint(lm, kind);
  return p ? { x: p.clientX, y: p.clientY } : null;
}

function planFor(lm: Landmark): UiInteractPlan {
  // Unified climb path
  if (
    isSafeClimbTarget(lm) &&
    (lm.type === "card" ||
      lm.type === "modal" ||
      lm.type === "hero" ||
      lm.type === "rail")
  ) {
    return {
      landmarkId: lm.id,
      type: lm.type,
      label: `climb:${lm.type}`,
      steps: [],
      totalMs: 12_000,
      climbLandmark: lm,
    };
  }

  const steps: UiInteractStep[] = [];
  const look = (kind: InteractionPoint["kind"]) => {
    const c = clientOf(lm, kind);
    return c ? { lookClient: c } : {};
  };

  switch (lm.type) {
    case "card":
    case "rail": {
      const thumb = pointToWorld(lm, "thumb");
      const label = pointToWorld(lm, "label");
      steps.push(
        {
          habitat: thumb,
          anim: "walk",
          ...look("thumb"),
          thought: "This poster…",
          delayMs: 0,
        },
        {
          anim: "point",
          holdMs: 900,
          ...look("thumb"),
          delayMs: 400,
        },
        {
          habitat: label,
          anim: "think",
          holdMs: 1200,
          ...look("label"),
          thought: "Title check.",
          delayMs: 500,
        },
      );
      break;
    }
    case "search": {
      const label = pointToWorld(lm, "label");
      steps.push(
        {
          habitat: label,
          anim: "walk",
          ...look("label"),
          thought: "What’s inside?",
          delayMs: 0,
        },
        {
          anim: "think",
          holdMs: 1500,
          ...look("center"),
          delayMs: 400,
        },
      );
      break;
    }
    case "button": {
      const center = pointToWorld(lm, "center");
      steps.push(
        {
          habitat: center,
          anim: "walk",
          ...look("center"),
          delayMs: 0,
        },
        {
          anim: "point",
          holdMs: 700,
          ...look("center"),
          thought: "Press?",
          delayMs: 300,
        },
      );
      break;
    }
    default: {
      const center = pointToWorld(lm, "center");
      steps.push(
        {
          habitat: center,
          anim: "walk",
          ...look("center"),
          delayMs: 0,
        },
        {
          anim: "point",
          holdMs: 900,
          delayMs: 300,
        },
      );
      break;
    }
  }

  const totalMs = steps.reduce(
    (s, st) => s + (st.delayMs ?? 0) + (st.holdMs ?? 600),
    0,
  );

  return {
    landmarkId: lm.id,
    type: lm.type,
    label: lm.type,
    steps,
    totalMs: Math.min(totalMs, 12_000),
  };
}

const OUTING_INTENTIONS: MascotIntention[] = [
  "investigate",
  "inspect-recommendation",
  "interact-ui",
  "guide",
  "explore",
  "play",
];

export function canStartUiInteraction(
  intention: MascotIntention,
  busy: boolean,
): boolean {
  if (busy) return false;
  if (!OUTING_INTENTIONS.includes(intention)) return false;
  if (COMPANION.traits.shyness > 0.65 && Math.random() < 0.4) return false;
  return true;
}

export function planUiInteraction(
  intention: MascotIntention,
  opts?: { preferType?: LandmarkType; landmarkId?: string },
): UiInteractPlan | null {
  const now = Date.now();
  let recent = 0;
  for (const t of lastPlanAt.values()) {
    if (now - t < GLOBAL_COOLDOWN_MS) recent++;
  }
  if (recent > 0 && Math.random() < 0.7) return null;

  let lm: Landmark | null = null;
  if (opts?.landmarkId) {
    lm =
      listByType("card").find((l) => l.id === opts.landmarkId) ||
      pickInterestingLandmark();
  } else if (opts?.preferType) {
    const pool = listByType(opts.preferType).filter((l) => l.visible && l.open);
    lm = pool[Math.floor(Math.random() * pool.length)] ?? null;
  }
  if (!lm) lm = pickInterestingLandmark();
  if (!lm) return null;

  const last = lastPlanAt.get(lm.id) ?? 0;
  if (now - last < GLOBAL_COOLDOWN_MS * 1.5) return null;

  if (
    intention === "inspect-recommendation" &&
    lm.type !== "card" &&
    lm.type !== "carousel" &&
    lm.type !== "rail" &&
    lm.type !== "hero"
  ) {
    const card = listByType("card").find((l) => l.visible);
    if (card) lm = card;
  }

  lastPlanAt.set(lm.id, now);
  return planFor(lm);
}

export type UiInteractRunner = {
  setTarget: (t: WorldPoint | null) => void;
  requestAnim: (req: {
    anim: MascotAnim;
    holdMs?: number;
    force?: boolean;
  }) => boolean;
  setLookBias: (b: { x: number; y: number }) => void;
  setJump: () => void;
  setThought: (t: string) => void;
  clampHabitat: (x: number, y: number) => WorldPoint;
};

export function executeUiInteraction(
  plan: UiInteractPlan,
  runner: UiInteractRunner,
): number {
  if (plan.climbLandmark) {
    const climbRunner: ClimbRunner = {
      setTarget: runner.setTarget,
      requestAnim: runner.requestAnim,
      setLookBias: runner.setLookBias,
      setJump: runner.setJump,
      setThought: runner.setThought,
      getPosition: () => {
        // Soft default; Actor/runtime is authoritative
        return { x: 0, y: -0.5 };
      },
    };
    return executeClimb(plan.climbLandmark, climbRunner);
  }

  let t = 0;
  for (const step of plan.steps) {
    const delay = t + (step.delayMs ?? 0);
    window.setTimeout(() => {
      if (step.lookClient) {
        runner.setLookBias({
          x: (step.lookClient.x / window.innerWidth - 0.5) * 2,
          y: (step.lookClient.y / window.innerHeight - 0.5) * 2,
        });
      }
      if (step.habitat) {
        const c = runner.clampHabitat(step.habitat.x, axisY(step.habitat));
        runner.setTarget(c);
      }
      if (step.jump) runner.setJump();
      if (step.anim) {
        runner.requestAnim({
          anim: step.anim,
          holdMs: step.holdMs,
          force: step.jump || step.anim === "surprised",
        });
      }
      if (step.thought) runner.setThought(step.thought);
    }, delay);
    t = delay + (step.holdMs ?? 500);
  }
  return plan.totalMs;
}
