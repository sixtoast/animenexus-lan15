/**
 * Apply a Decision to the live store (side effects only).
 */

import type { Decision } from "./decision";
import { useMascotStore } from "./store";

export function executeDecision(d: Decision) {
  const store = useMascotStore.getState();
  const { plan, goal, seekUi } = d;

  // Emotion first
  for (const [k, v] of Object.entries(plan.emotionDeltas)) {
    if (typeof v === "number") {
      store.bumpEmotion(k as keyof typeof store.emotions, v);
    }
  }

  // Goal
  if (goal) {
    store.applyGoal(goal);
  }

  // Animation (force personality beats)
  if (plan.anim !== "idle" || plan.holdMs > 0) {
    store.requestAnim({
      anim: plan.anim,
      holdMs: plan.holdMs || undefined,
      force: true,
    });
  }
  if (plan.follow) {
    window.setTimeout(() => {
      useMascotStore.getState().requestAnim({
        anim: plan.follow!.anim,
        holdMs: plan.follow!.holdMs || undefined,
        force: true,
      });
    }, plan.holdMs || 300);
  }

  // Debug / future speech
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
