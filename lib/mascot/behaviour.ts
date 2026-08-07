/**
 * Behaviour facade — Utility AI under the hood (Sprint M9).
 */

import type { MascotEmotions } from "./types";
import {
  pickUtilityGoal,
  utilityCooldownMs,
  type UtilityContext,
} from "./utility-ai";

export type MascotGoal =
  | "idle"
  | "wander"
  | "nap"
  | "ponder"
  | "seek-attention"
  | "celebrate";

export type BehaviourDecision = {
  goal: MascotGoal;
  reason: string;
  cooldownMs: number;
};

export function chooseBehaviour(
  emotions: MascotEmotions,
  opts: {
    msSinceInteract: number;
    currentGoal: MascotGoal;
    busy: boolean;
    modalOpen?: boolean;
  },
): BehaviourDecision | null {
  const ctx: UtilityContext = {
    emotions,
    msSinceInteract: opts.msSinceInteract,
    currentGoal: opts.currentGoal,
    busy: opts.busy,
    modalOpen: opts.modalOpen,
  };

  const picked = pickUtilityGoal(ctx);
  if (!picked) return null;

  return {
    goal: picked.goal,
    reason: `${picked.reason} (u=${picked.score.toFixed(2)})`,
    cooldownMs: utilityCooldownMs(picked),
  };
}
