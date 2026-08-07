/**
 * Apply a Decision to the live store (side effects only).
 * Takes a getStore callback so this module never imports store.ts
 * (avoids circular dependency crashes on the client).
 */

import type { Decision } from "./decision";
import type { MascotEmotions } from "./types";
import type { MascotGoal } from "./behaviour";
import type { AnimRequest } from "./anim-machine";

export type MascotStoreSlice = {
  bumpEmotion: (key: keyof MascotEmotions, delta: number) => void;
  applyGoal: (goal: MascotGoal) => void;
  requestAnim: (req: AnimRequest) => boolean;
};

export function executeDecision(
  d: Decision,
  getStore: () => MascotStoreSlice,
) {
  const store = getStore();
  const { plan, goal, seekUi } = d;

  for (const [k, v] of Object.entries(plan.emotionDeltas)) {
    if (typeof v === "number") {
      store.bumpEmotion(k as keyof MascotEmotions, v);
    }
  }

  if (goal) {
    store.applyGoal(goal);
  }

  if (plan.anim !== "idle" || plan.holdMs > 0) {
    store.requestAnim({
      anim: plan.anim,
      holdMs: plan.holdMs || undefined,
      force: true,
    });
  }
  if (plan.follow) {
    const follow = plan.follow;
    window.setTimeout(() => {
      getStore().requestAnim({
        anim: follow.anim,
        holdMs: follow.holdMs || undefined,
        force: true,
      });
    }, plan.holdMs || 300);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("animenexus:mascot-thought", {
        detail: {
          text: d.thought.text,
          intent: d.intent,
          lineKey: plan.lineKey,
          seekUi: !!seekUi,
        },
      }),
    );
  }
}
