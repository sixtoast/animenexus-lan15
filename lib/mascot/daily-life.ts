/**
 * Sprint 17 — Daily life
 *
 * Lightweight simulated routine. Flexible, not a rigid clock schedule.
 * Beats suggest intention / goal / home; Director may still override.
 */

import type { MascotIntention } from "./director";
import type { MascotGoal } from "./behaviour";
import type { MascotEmotions } from "./types";
import type { MascotExpression } from "./expression";
import { dayPart, type DayPart, COMPANION } from "./personality";

export type RoutineBeat = {
  id: string;
  intention: MascotIntention;
  goal?: MascotGoal;
  goHome?: boolean;
  expressionHint?: MascotExpression;
  thought?: string;
  reason: string;
  weight: number;
};

/** Soft activity windows by day part (not exclusive). */
const BEATS: Record<DayPart, RoutineBeat[]> = {
  dawn: [
    {
      id: "dawn-stir",
      intention: "rest",
      goal: "ponder",
      goHome: true,
      expressionHint: "sleepy",
      thought: "…still early.",
      reason: "dawn — stir",
      weight: 1.4,
    },
    {
      id: "dawn-sleep",
      intention: "sleep",
      goal: "nap",
      goHome: true,
      expressionHint: "sleepy",
      reason: "dawn — more sleep",
      weight: 1.8,
    },
  ],
  morning: [
    {
      id: "morning-wake",
      intention: "greet",
      goal: "seek-attention",
      expressionHint: "happy",
      thought: "Morning.",
      reason: "morning — wake",
      weight: 1.2,
    },
    {
      id: "morning-stretch",
      intention: "play",
      goal: "wander",
      expressionHint: "curious",
      thought: "Stretch…",
      reason: "morning — stretch",
      weight: 1.5,
    },
    {
      id: "morning-look",
      intention: "observe",
      goal: "ponder",
      expressionHint: "curious",
      thought: "Look around.",
      reason: "morning — look around",
      weight: 1.3,
    },
    {
      id: "morning-explore",
      intention: "explore",
      goal: "wander",
      reason: "morning — explore",
      weight: 1.0,
    },
  ],
  afternoon: [
    {
      id: "afternoon-explore",
      intention: "explore",
      goal: "wander",
      reason: "afternoon — explore",
      weight: 1.4,
    },
    {
      id: "afternoon-interact",
      intention: "interact-ui",
      goal: "wander",
      expressionHint: "curious",
      reason: "afternoon — interact",
      weight: 1.2,
    },
    {
      id: "afternoon-browse",
      intention: "inspect-recommendation",
      goal: "wander",
      expressionHint: "curious",
      thought: "Signals…",
      reason: "afternoon — browse recs",
      weight: 1.5,
    },
    {
      id: "afternoon-guide",
      intention: "guide",
      goal: "wander",
      reason: "afternoon — guide",
      weight: 1.1,
    },
  ],
  evening: [
    {
      id: "evening-slow",
      intention: "rest",
      goal: "ponder",
      goHome: true,
      expressionHint: "focused",
      thought: "Slowing down.",
      reason: "evening — slow down",
      weight: 1.4,
    },
    {
      id: "evening-read",
      intention: "rest",
      goal: "ponder",
      goHome: true,
      expressionHint: "focused",
      thought: "A quiet volume.",
      reason: "evening — read",
      weight: 1.5,
    },
    {
      id: "evening-browse",
      intention: "inspect-recommendation",
      goal: "wander",
      expressionHint: "curious",
      reason: "evening — soft browse",
      weight: 1.0,
    },
    {
      id: "evening-observe",
      intention: "observe",
      goal: "idle",
      reason: "evening — observe",
      weight: 0.9,
    },
  ],
  night: [
    {
      id: "night-curious",
      intention: "investigate",
      goal: "wander",
      expressionHint: "curious",
      thought: "Late signals…",
      reason: "night — still curious",
      weight: 1.1,
    },
    {
      id: "night-read",
      intention: "rest",
      goal: "ponder",
      goHome: true,
      expressionHint: "focused",
      reason: "night — read",
      weight: 1.2,
    },
    {
      id: "night-sleep",
      intention: "sleep",
      goal: "nap",
      goHome: true,
      expressionHint: "sleepy",
      thought: "Dim the light…",
      reason: "night — sleep",
      weight: 1.4,
    },
  ],
  late: [
    {
      id: "late-sleep",
      intention: "sleep",
      goal: "nap",
      goHome: true,
      expressionHint: "sleepy",
      thought: "…zzz",
      reason: "late — sleep",
      weight: 2.2,
    },
    {
      id: "late-rest",
      intention: "rest",
      goal: "ponder",
      goHome: true,
      expressionHint: "sleepy",
      reason: "late — rest",
      weight: 1.0,
    },
  ],
};

let lastBeatId: string | null = null;
let lastBeatAt = 0;
const BEAT_COOLDOWN_MS = 18_000;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Emotion + trait nudges on beat weights */
function weightFor(
  beat: RoutineBeat,
  emotions: MascotEmotions,
): number {
  let w = beat.weight;
  const t = COMPANION.traits;

  if (beat.intention === "sleep" || beat.goal === "nap") {
    w *= 0.7 + emotions.sleepiness * 0.8 + t.laziness * 0.3;
    w *= 1 - emotions.energy * 0.25;
  }
  if (beat.intention === "explore" || beat.intention === "investigate") {
    w *= 0.6 + emotions.curiosity * 0.5 + t.curiosity * 0.3;
    w *= 0.7 + emotions.energy * 0.4;
  }
  if (
    beat.intention === "inspect-recommendation" ||
    beat.intention === "guide"
  ) {
    w *= 0.6 + emotions.curiosity * 0.4 + t.helpfulness * 0.35;
  }
  if (beat.intention === "play") {
    w *= 0.5 + t.playfulness * 0.5 + emotions.energy * 0.3;
  }
  if (beat.intention === "rest" || beat.goHome) {
    w *= 0.7 + emotions.stress * 0.3 + t.laziness * 0.2;
  }
  // Avoid repeating same beat immediately
  if (beat.id === lastBeatId) w *= 0.25;

  return Math.max(0.05, w);
}

export function pickRoutineBeat(
  emotions: MascotEmotions,
  now = new Date(),
): RoutineBeat | null {
  if (Date.now() - lastBeatAt < BEAT_COOLDOWN_MS) return null;

  const part = dayPart(now);
  const pool = BEATS[part] ?? BEATS.afternoon;
  const scored = pool.map((b) => ({ b, w: weightFor(b, emotions) }));
  const total = scored.reduce((a, s) => a + s.w, 0);
  let r = Math.random() * total;
  for (const row of scored) {
    r -= row.w;
    if (r <= 0) {
      lastBeatId = row.b.id;
      lastBeatAt = Date.now();
      return row.b;
    }
  }
  return scored[0]?.b ?? null;
}

/** Soft emotion drift from time of day (applied sparingly by store/tick). */
export function routineEmotionNudge(
  emotions: MascotEmotions,
  now = new Date(),
): Partial<MascotEmotions> {
  const part = dayPart(now);
  switch (part) {
    case "dawn":
      return { sleepiness: clamp01(emotions.sleepiness + 0.02) };
    case "morning":
      return {
        energy: clamp01(emotions.energy + 0.015),
        sleepiness: clamp01(emotions.sleepiness - 0.02),
      };
    case "afternoon":
      return { curiosity: clamp01(emotions.curiosity + 0.01) };
    case "evening":
      return {
        curiosity: clamp01(emotions.curiosity + 0.008),
        energy: clamp01(emotions.energy - 0.008),
      };
    case "night":
      return {
        sleepiness: clamp01(emotions.sleepiness + 0.012),
        curiosity: clamp01(emotions.curiosity + 0.01),
      };
    case "late":
      return {
        sleepiness: clamp01(emotions.sleepiness + 0.025),
        energy: clamp01(emotions.energy - 0.02),
      };
    default:
      return {};
  }
}

export function describeRoutine(now = new Date()): string {
  return `daily · ${dayPart(now)}`;
}
