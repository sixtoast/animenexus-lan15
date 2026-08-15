/**
 * Sprint 11 — Physical UI interactions
 * Sprint 14 — Climb phases on climbable surfaces
 */

import type { MascotAnim } from "./types";
import type { MascotIntention } from "./director";
import type { Landmark, LandmarkType, InteractionPoint } from "./ui-registry";
import {
  landmarkToHabitat,
  preferredPoint,
  pickInterestingLandmark,
  listByType,
} from "./ui-registry";
import { COMPANION } from "./personality";
import { isSafeClimbTarget } from "./climbing";

export type UiInteractStep = {
  habitat?: { x: number; z: number } | null;
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
};

const lastPlanAt = new Map<string, number>();
const GLOBAL_COOLDOWN_MS = 14_000;

function pointToHabitat(
  lm: Landmark,
  kind: InteractionPoint["kind"],
): { x: number; z: number } | null {
  return landmarkToHabitat(lm, kind);
}

function clientOf(
  lm: Landmark,
  kind: InteractionPoint["kind"],
): { x: number; y: number } | null {
  const p = preferredPoint(lm, kind);
  return p ? { x: p.clientX, y: p.clientY } : null;
}

/** Sprint 14 — full climb sequence when platform is safe */
function planClimbSequence(lm: Landmark): UiInteractStep[] {
  const edge = pointToHabitat(lm, "edge");
  const top = pointToHabitat(lm, "top");
  const header = pointToHabitat(lm, "header");
  const center = pointToHabitat(lm, "center");
  const surface = header ?? top ?? center;
  const approach = edge
    ? { x: edge.x * 0.9, z: Math.min((edge.z ?? 0) + 0.06, 0.22) }
    : surface
      ? { x: surface.x * 0.9, z: Math.min(surface.z + 0.06, 0.22) }
      : null;

  const look = (kind: InteractionPoint["kind"]) => {
    const c = clientOf(lm, kind);
    return c ? { lookClient: c } : {};
  };

  return [
    {
      habitat: approach,
      anim: "walk",
      holdMs: 700,
      ...look("edge"),
      thought: "Up there…",
      delayMs: 0,
    },
    {
      habitat: approach,
      anim: "idle",
      holdMs: 280,
      ...look("top"),
      thought: "Ready.",
      delayMs: 50,
    },
    {
      habitat: surface,
      anim: "jump",
      holdMs: 420,
      jump: true,
      ...look("top"),
      delayMs: 40,
    },
    {
      habitat: surface,
      anim: "point",
      holdMs: 220,
      ...look("header"),
      thought: "Got it.",
      delayMs: 40,
    },
    {
      habitat: surface,
      anim: "jump",
      holdMs: 380,
      jump: true,
      delayMs: 40,
    },
    {
      habitat: surface,
      anim: "idle",
      holdMs: 450,
      thought: "Steady…",
      delayMs: 40,
    },
    {
      habitat: surface,
      anim: "think",
      holdMs: 1600,
      ...look("center"),
      thought: lm.type === "modal" ? "Nice view." : "Comfy.",
      delayMs: 40,
    },
    // Dismount toward home-ish
    {
      habitat: approach
        ? { x: approach.x * 0.5, z: approach.z * 0.5 }
        : { x: 0.28, z: 0.1 },
      anim: "jump",
      holdMs: 350,
      jump: true,
      thought: "Down.",
      delayMs: 80,
    },
    {
      habitat: { x: 0.32, z: 0.08 },
      anim: "idle",
      holdMs: 500,
      delayMs: 40,
    },
  ];
}

function planFor(lm: Landmark): UiInteractPlan {
  const steps: UiInteractStep[] = [];
  const look = (kind: InteractionPoint["kind"]) => {
    const c = clientOf(lm, kind);
    return c ? { lookClient: c } : {};
  };

  // Sprint 14 — prefer full climb on safe climbable platforms
  if (isSafeClimbTarget(lm) && (lm.type === "card" || lm.type === "modal" || lm.type === "hero" || lm.type === "rail")) {
    const climbSteps = planClimbSequence(lm);
    const totalMs = climbSteps.reduce(
      (s, st) => s + (st.delayMs ?? 0) + (st.holdMs ?? 600),
      0,
    );
    return {
      landmarkId: lm.id,
      type: lm.type,
      label: `climb:${lm.type}`,
      steps: climbSteps,
      totalMs: Math.min(totalMs, 14_000),
    };
  }

  switch (lm.type) {
    case "card":
    case "rail": {
      const thumb = pointToHabitat(lm, "thumb");
      const label = pointToHabitat(lm, "label");
      steps.push(
        {
          habitat: thumb,
          anim: "walk",
          ...look("thumb"),
          thought: "This poster…",
          delayMs: 0,
        },
        {
          anim: lm.climbable ? "jump" : "point",
          holdMs: lm.climbable ? 450 : 900,
          jump: lm.climbable,
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
        {
          anim: "point",
          holdMs: 1100,
          ...look("center"),
          delayMs: 200,
        },
      );
      break;
    }
    case "modal": {
      const edge = pointToHabitat(lm, "edge");
      const header = pointToHabitat(lm, "header");
      const top = pointToHabitat(lm, "top");
      steps.push(
        {
          habitat: edge,
          anim: "walk",
          ...look("edge"),
          thought: "Big panel…",
          delayMs: 0,
        },
        {
          anim: "jump",
          holdMs: 500,
          jump: true,
          ...look("header"),
          delayMs: 350,
        },
        {
          habitat: header,
          anim: "point",
          holdMs: 900,
          ...look("header"),
          thought: "Peek.",
          delayMs: 400,
        },
        {
          habitat: top,
          anim: "think",
          holdMs: 1400,
          ...look("center"),
          delayMs: 200,
        },
      );
      break;
    }
    case "search": {
      const label = pointToHabitat(lm, "label");
      const center = pointToHabitat(lm, "center");
      steps.push(
        {
          habitat: label,
          anim: "walk",
          ...look("label"),
          thought: "What’s inside?",
          delayMs: 0,
        },
        {
          habitat: center,
          anim: "think",
          holdMs: 1500,
          ...look("center"),
          thought: "Searching… sort of.",
          delayMs: 400,
        },
        {
          anim: "point",
          holdMs: 800,
          ...look("center"),
          delayMs: 200,
        },
      );
      break;
    }
    case "button": {
      const center = pointToHabitat(lm, "center");
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
        {
          anim: "happy",
          holdMs: 600,
          delayMs: 200,
        },
      );
      break;
    }
    case "dropdown": {
      const center = pointToHabitat(lm, "center");
      steps.push(
        {
          habitat: center ? { x: center.x + 0.08, z: center.z } : null,
          anim: "walk",
          ...look("center"),
          thought: "Hide…",
          delayMs: 0,
        },
        {
          anim: "think",
          holdMs: 1200,
          ...look("center"),
          delayMs: 300,
        },
      );
      break;
    }
    case "notification": {
      const top = pointToHabitat(lm, "top");
      steps.push(
        {
          habitat: top,
          anim: "walk",
          ...look("top"),
          thought: "A signal.",
          delayMs: 0,
        },
        {
          anim: "surprised",
          holdMs: 600,
          ...look("center"),
          delayMs: 250,
        },
        {
          anim: "point",
          holdMs: 900,
          delayMs: 150,
        },
      );
      break;
    }
    case "carousel": {
      const a = pointToHabitat(lm, "thumb");
      const b = pointToHabitat(lm, "label");
      steps.push(
        {
          habitat: a,
          anim: "walk",
          ...look("thumb"),
          delayMs: 0,
        },
        {
          anim: "jump",
          holdMs: 450,
          jump: true,
          delayMs: 300,
        },
        {
          habitat: b,
          anim: "walk",
          ...look("label"),
          thought: "Next card.",
          delayMs: 200,
        },
        {
          anim: "point",
          holdMs: 800,
          delayMs: 200,
        },
      );
      break;
    }
    case "progress": {
      const start = pointToHabitat(lm, "edge");
      const end =
        lm.points.find(
          (p) => p.kind === "edge" && p !== preferredPoint(lm, "edge"),
        ) || preferredPoint(lm, "edge");
      const endHab = end
        ? landmarkToHabitat({ ...lm, points: [end, ...lm.points] }, "edge")
        : start;
      steps.push(
        {
          habitat: start,
          anim: "walk",
          ...look("edge"),
          thought: "Along the bar.",
          delayMs: 0,
        },
        {
          habitat: endHab,
          anim: "walk",
          delayMs: 400,
        },
        {
          anim: "happy",
          holdMs: 700,
          delayMs: 200,
        },
      );
      break;
    }
    case "hero": {
      const top = pointToHabitat(lm, "top");
      const center = pointToHabitat(lm, "center");
      steps.push(
        {
          habitat: top,
          anim: "walk",
          ...look("top"),
          delayMs: 0,
        },
        {
          habitat: center,
          anim: "jump",
          holdMs: 450,
          jump: true,
          delayMs: 300,
        },
        {
          anim: "point",
          holdMs: 1000,
          ...look("center"),
          thought: "Big one.",
          delayMs: 200,
        },
      );
      break;
    }
    case "tab":
    case "navbar":
    case "nav":
    case "sidebar":
    default: {
      const center = pointToHabitat(lm, "center");
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
  setTarget: (t: { x: number; z: number } | null) => void;
  requestAnim: (req: {
    anim: MascotAnim;
    holdMs?: number;
    force?: boolean;
  }) => boolean;
  setLookBias: (b: { x: number; y: number }) => void;
  setJump: () => void;
  setThought: (t: string) => void;
  clampHabitat: (x: number, z: number) => { x: number; z: number };
};

export function executeUiInteraction(
  plan: UiInteractPlan,
  runner: UiInteractRunner,
): number {
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
        const c = runner.clampHabitat(step.habitat.x, step.habitat.z);
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
