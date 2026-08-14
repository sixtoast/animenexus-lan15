/**
 * Sprint 5 — MascotDirector (+ Sprint 6 personality hooks)
 *
 * High-level intention layer. Does not drive meshes directly.
 */

import type { MascotEmotions, MascotContext } from "./types";
import type { MascotGoal } from "./behaviour";
import { chooseBehaviour } from "./behaviour";
import { decide, decideAmbient, type Decision } from "./decision";
import {
  COMPANION,
  dayPart,
  routineBias,
  traitLonelyScale,
} from "./personality";
import { bondStage, getMemory } from "./memory";
import type { MascotExpression } from "./expression";
import { expressionFromEmotions } from "./expression";

export type MascotIntention =
  | "observe"
  | "rest"
  | "sleep"
  | "explore"
  | "investigate"
  | "inspect-recommendation"
  | "interact-ui"
  | "greet"
  | "play"
  | "guide"
  | "celebrate"
  | "hide"
  | "seek-attention"
  | "idle";

export type DirectorWorld = {
  emotions: MascotEmotions;
  context: MascotContext;
  msSinceInteract: number;
  currentGoal: MascotGoal;
  currentIntention: MascotIntention;
  busy: boolean;
  hasTarget: boolean;
  modalOpen?: boolean;
  loading?: boolean;
};

export type DirectorDirective = {
  intention: MascotIntention;
  goal?: MascotGoal;
  decision?: Decision;
  expressionHint?: MascotExpression;
  reason: string;
  cooldownMs: number;
};

const INTENTION_HOLD_MS: Record<MascotIntention, number> = {
  sleep: 14_000,
  rest: 10_000,
  celebrate: 6_000,
  "seek-attention": 10_000,
  explore: 6_000,
  investigate: 5_000,
  "inspect-recommendation": 5_000,
  "interact-ui": 4_000,
  hide: 8_000,
  greet: 4_000,
  play: 5_000,
  guide: 7_000,
  observe: 5_000,
  idle: 4_000,
};

function intentionFromGoal(goal: MascotGoal): MascotIntention {
  switch (goal) {
    case "nap":
      return "sleep";
    case "ponder":
      return "rest";
    case "wander":
      return "explore";
    case "seek-attention":
      return "seek-attention";
    case "celebrate":
      return "celebrate";
    case "idle":
    default:
      return "idle";
  }
}

function goalFromIntention(intention: MascotIntention): MascotGoal {
  switch (intention) {
    case "sleep":
      return "nap";
    case "rest":
    case "hide":
      return "ponder";
    case "explore":
    case "investigate":
    case "inspect-recommendation":
    case "interact-ui":
    case "guide":
      return "wander";
    case "seek-attention":
    case "greet":
      return "seek-attention";
    case "celebrate":
    case "play":
      return "celebrate";
    case "observe":
    case "idle":
    default:
      return "idle";
  }
}

export function directorAmbient(world: DirectorWorld): DirectorDirective | null {
  if (world.busy) return null;

  const r = routineBias(dayPart());
  const e = world.emotions;
  const mem = getMemory();
  const stage = bondStage(mem);
  const traits = COMPANION.traits;

  if (world.loading && e.sleepiness > 0.55) {
    return {
      intention: "sleep",
      goal: "nap",
      reason: "loading dragged on — rest",
      expressionHint: "sleepy",
      cooldownMs: 10_000,
    };
  }

  if (world.modalOpen && e.curiosity > 0.45 && traits.curiosity > 0.5) {
    return {
      intention: "investigate",
      goal: "wander",
      reason: "modal is stage — investigate",
      expressionHint: "curious",
      cooldownMs: 5_000,
    };
  }

  const baseLonely =
    stage === "close" ? 38_000 : stage === "stranger" ? 72_000 : 52_000;
  const lonelyMs = baseLonely * traitLonelyScale();
  if (
    world.msSinceInteract > lonelyMs &&
    e.attention < 0.45 &&
    !world.loading
  ) {
    const intention: MascotIntention =
      stage === "close" && traits.helpfulness > 0.55
        ? "guide"
        : traits.shyness > 0.55
          ? "greet"
          : "seek-attention";
    return {
      intention,
      goal: "seek-attention",
      reason: `desk quiet (${stage}) → ${intention}`,
      expressionHint: stage === "close" ? "curious" : "embarrassed",
      cooldownMs: 10_000,
    };
  }

  const ambient = decideAmbient({
    emotions: e,
    msSinceInteract: world.msSinceInteract,
  });
  if (ambient && Math.random() < 0.5) {
    const intention: MascotIntention =
      ambient.intent === "nap"
        ? "sleep"
        : ambient.intent === "curious" || ambient.intent === "point"
          ? "explore"
          : ambient.goal === "seek-attention"
            ? "seek-attention"
            : "observe";
    return {
      intention,
      goal: ambient.goal,
      decision: ambient,
      reason: `ambient decision → ${intention}`,
      expressionHint: expressionFromEmotions(e),
      cooldownMs: INTENTION_HOLD_MS[intention],
    };
  }

  const behaviour = chooseBehaviour(e, {
    msSinceInteract: world.msSinceInteract,
    currentGoal: world.currentGoal,
    busy: world.busy,
    modalOpen: world.modalOpen,
  });
  if (!behaviour) return null;

  let intention = intentionFromGoal(behaviour.goal);

  if (behaviour.goal === "wander") {
    if (world.context === "browsing" && e.curiosity > 0.55) {
      intention = "inspect-recommendation";
    } else if (
      (traits.mischievousness > 0.35 || traits.playfulness > 0.55) &&
      Math.random() < 0.22
    ) {
      intention = "play";
    } else if (e.curiosity > 0.6 || traits.curiosity > 0.7) {
      intention = "investigate";
    } else {
      intention = "explore";
    }
  }
  if (behaviour.goal === "nap" && (r.preferNap || traits.laziness > 0.55))
    intention = "sleep";
  if (behaviour.goal === "ponder" && (e.stress > 0.5 || traits.shyness > 0.65))
    intention = "hide";

  if (
    intention === world.currentIntention &&
    behaviour.goal !== "wander" &&
    behaviour.goal === world.currentGoal
  ) {
    return {
      intention,
      reason: `hold ${intention} (${behaviour.reason})`,
      cooldownMs: Math.min(behaviour.cooldownMs, 4_000),
    };
  }

  return {
    intention,
    goal: behaviour.goal,
    reason: `${behaviour.reason} → ${intention}`,
    expressionHint: expressionFromEmotions(e),
    cooldownMs: INTENTION_HOLD_MS[intention] ?? behaviour.cooldownMs,
  };
}

export function directorOnEvent(
  event:
    | "pet"
    | "drag"
    | "seal"
    | "complete"
    | "idle-long"
    | "route"
    | "search"
    | "modal-open"
    | "error"
    | "empty-list"
    | "notice-ui",
  world: DirectorWorld,
): DirectorDirective {
  const decisionEvent =
    event === "error" || event === "empty-list" || event === "notice-ui"
      ? null
      : event === "search"
        ? ("search" as const)
        : event === "modal-open"
          ? ("modal-open" as const)
          : event;

  const decision = decisionEvent
    ? decide(decisionEvent, {
        emotions: world.emotions,
        msSinceInteract: world.msSinceInteract,
      })
    : null;

  const t = COMPANION.traits;

  switch (event) {
    case "pet":
      return {
        intention: t.playfulness > 0.55 ? "play" : "greet",
        goal: decision?.goal,
        decision: decision ?? undefined,
        reason: "user pet → play / trust",
        expressionHint: t.shyness > 0.55 ? "embarrassed" : "happy",
        cooldownMs: 3_500,
      };
    case "drag":
      return {
        intention: "play",
        decision: decision ?? undefined,
        reason: "dragged — complain then settle",
        expressionHint: "annoyed",
        cooldownMs: 3_000,
      };
    case "seal":
    case "complete":
      return {
        intention: "celebrate",
        goal: "celebrate",
        decision: decision ?? undefined,
        reason: "seal/complete → celebrate",
        expressionHint: t.enthusiasm > 0.5 ? "excited" : "proud",
        cooldownMs: 5_000,
      };
    case "idle-long":
      return {
        intention:
          world.emotions.sleepiness > 0.55 || t.laziness > 0.55
            ? "sleep"
            : "rest",
        goal:
          decision?.goal ??
          (world.emotions.sleepiness > 0.55 || t.laziness > 0.55
            ? "nap"
            : "ponder"),
        decision: decision ?? undefined,
        reason: "long idle",
        expressionHint: "sleepy",
        cooldownMs: 8_000,
      };
    case "route":
      return {
        intention: "greet",
        goal: decision?.goal,
        decision: decision ?? undefined,
        reason: "route change → soft greet",
        expressionHint: "happy",
        cooldownMs: 4_000,
      };
    case "search":
      return {
        intention: "investigate",
        goal: "wander",
        decision: decision ?? undefined,
        reason: "search → investigate",
        expressionHint: "curious",
        cooldownMs: 4_000,
      };
    case "modal-open":
      return {
        intention: "investigate",
        goal: "wander",
        decision: decision ?? undefined,
        reason: "modal opened",
        expressionHint: "curious",
        cooldownMs: 4_000,
      };
    case "error":
      return {
        intention: t.shyness > 0.5 ? "hide" : "observe",
        goal: "ponder",
        reason: "error — flinch",
        expressionHint: "surprised",
        cooldownMs: 3_000,
      };
    case "empty-list":
      return {
        intention: "observe",
        goal: "ponder",
        reason: "empty shelf — think",
        expressionHint: "confused",
        cooldownMs: 4_000,
      };
    case "notice-ui":
      return {
        intention:
          t.helpfulness > 0.6 ? "guide" : "inspect-recommendation",
        goal: "wander",
        reason: "noticed UI landmark",
        expressionHint: "curious",
        cooldownMs: 3_500,
      };
    default:
      return {
        intention: "observe",
        reason: "unknown event",
        cooldownMs: 3_000,
      };
  }
}

export function intentionToGoal(intention: MascotIntention): MascotGoal {
  return goalFromIntention(intention);
}
