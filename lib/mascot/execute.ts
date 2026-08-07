/**
 * Apply a Decision to the live store (side effects only).
 * Lazy-loads the store to avoid a circular import with store.ts.
 */

import type { Decision } from "./decision";

export function executeDecision(d: Decision) {
  // Dynamic import path would be async; use require-style lazy getter instead.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMascotStore } = require("./store") as typeof import("./store");
  const store = useMascotStore.getState();
  const { plan, goal, seekUi } = d;

  for (const [k, v] of Object.entries(plan.emotionDeltas)) {
    if (typeof v === "number") {
      store.bumpEmotion(k as keyof typeof store.emotions, v);
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
    window.setTimeout(() => {
      const { useMascotStore: s } = require("./store") as typeof import("./store");
      s.getState().requestAnim({
        anim: plan.follow!.anim,
        holdMs: plan.follow!.holdMs || undefined,
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
