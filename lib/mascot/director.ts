/**
 * Sprint 5 — MascotDirector
 *
 * High-level intention layer. Does not drive meshes directly.
 *
 *   USER / UI EVENTS
 *        ↓
 *   WORLD STATE + EMOTIONS
 *        ↓
 *   MASCOT DIRECTOR  ← this module (what am I trying to do?)
 *        ↓
 *   UTILITY AI / DECISION
 *        ↓
 *   BEHAVIOUR → GOAL → ANIM LAYERS + EXPRESSION
 *
 * The Director reasons in intentions, not raw anim names.
 */

import type { MascotEmotions, MascotContext } from "./types";
import type { MascotGoal } from "./behaviour";
import { chooseBehaviour } from "./behaviour";
import { decide, decideAmbient, type Decision } from "./decision";
import { COMPANION, dayPart, routineBias } from "./personality";
import { bondStage, getMemory } from "./memory";
import type { MascotExpression } from "./expression";
import { expressionFromEmotions } from "./expression";

/** What Lantern-ko is *trying* to do right now. */
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
  /** Optional goal to push into applyGoal */
  goal?: MascotGoal;
  /** Optional full decision (event reactions) */
  decision?: Decision;
  /** Soft expression hint (face layer) */
  expressionHint?: MascotExpression;
  /** Human-readable why (debug / thoughts) */
  reason: string;
  /** Suggested cooldown before next director think */
  cooldownMs: number;
};

const INTENTION_HOLD_MS: Partial<Record<MascotIntention, number>> = {
  sleep: 14_000,
  rest: 10_000,
  celebrate: 6_000,
  seek_attention: 10_000 as unknown as number, // typo guard — real key below
  "seek-attention": 10_000,
  explore: 6_000,
  investigate: 5_000,
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

function goalFromIntention(intention: MascotIntention): MascotGoal | undefined {
  switch (intention) {
    case "sleep":
      return "nap";
    case "rest":
      return "ponder";
    case "explore":
    case "investigate":
    case "inspect-recommendation":
    case "interact-ui":
      return "wander";
    case "seek-attention":
    case "greet":
      return "seek-attention";
    case "celebrate":
    case "play":
      return "celebrate";
    case "hide":
      return "ponder";
    case "guide":
      return "wander";
    case "observe":
    case "idle":
    default:
      return "idle";
  }
}

/**
 * Ambient director tick — pick an intention when nothing urgent is happening.
 * Prefers existing Utility AI scores, then maps goal → intention with world flavour.
 */
export function directorAmbient(world: DirectorWorld): DirectorDirective | null {
  if (world.busy) return null;

  const r = routineBias(dayPart());
  const e = world.emotions;
  const mem = getMemory();
  const stage = bondStage(mem);
  const traits = COMPANION.traits;

  // Hard constraints first
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

  // Relationship-shaped loneliness
  const lonelyMs =
    stage === "close" ? 38_000 : stage === "stranger" ? 72_000 : 52_000;
  if (
    world.msSinceInteract > lonelyMs &&
    e.attention < 0.45 &&
    !world.loading
  ) {
    const intention: MascotIntention =
      stage === "close"
        ? "guide"
        : traits.shyness > 0.55
          ? "greet"
          : "seek-attention";
    return {
      intention,
      goal: "seek-attention",
      reason: `desk quiet (${stage}) → ${intention}`,
      expressionHint: stage === "close" ? "curious" : "shy_wave" as MascotExpression,
      cooldownMs: 10_000,
    };
  }

  // Prefer decideAmbient when it has a strong read
  const ambient = decideAmbient({
    emotions: e,
    msSinceInteract: world.msSinceInteract,
  });
  if (ambient && Math.random() < 0.5) {
    const intention =
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
      cooldownMs: INTENTION_HOLD_MS[intention] ?? 6_000,
    };
  }

  // Utility AI as the stable backbone
  const behaviour = chooseBehaviour(e, {
    msSinceInteract: world.msSinceInteract,
    currentGoal: world.currentGoal,
    busy: world.busy,
    modalOpen: world.modalOpen,
  });
  if (!behaviour) return null;

  let intention = intentionFromGoal(behaviour.goal);

  // Personality flavour on top of utility pick
  if (behaviour.goal === "wander") {
    if (world.context === "browsing" && e.curiosity > 0.55) {
      intention = "inspect-recommendation";
    } else if (traits.mischief > 0.4 && Math.random() < 0.2) {
      intention = "play";
    } else if (e.curiosity > 0.6) {
      intention = "investigate";
    } else {
      intention = "explore";
    }
  }
  if (behaviour.goal === "nap" && r.preferNap) intention = "sleep";
  if (behaviour.goal === "ponder" && e.stress > 0.5) intention = "hide";

  // Avoid thrashing the same intention
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

/**
 * Event-driven director — maps discrete user/UI events to intentions.
 */
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
  const decision =
    event === "error" || event === "empty-list" || event === "notice-ui"
      ? null
      : decide(
          event === "search" ? "search" : event === "modal-open" ? "modal-open" : event,
          {
            emotions: world.emotions,
            msSinceInteract: world.msSinceInteract,
          },
        );

  switch (event) {
    case "pet":
      return {
        intention: "play",
        goal: decision?.goal,
        decision: decision ?? undefined,
        reason: "user pet → play / trust",
        expressionHint: "happy",
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
        expressionHint: "proud",
        cooldownMs: 5_000,
      };
    case "idle-long":
      return {
        intention: world.emotions.sleepiness > 0.55 ? "sleep" : "rest",
        goal: decision?.goal ?? (world.emotions.sleepiness > 0.55 ? "nap" : "ponder"),
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
        intention: "hide",
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
        intention: "inspect-recommendation",
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
  return goalFromIntention(intention) ?? "idle";
}
