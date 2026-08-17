/**
 * Sprint 4 — Director/store request locomotion without Actor inventing it.
 */

import {
  clearMovementCommand,
  issueFromStoreTarget,
  issueReturnHome,
  issueMovementCommand,
} from "./movement-command";
import type { WorldPoint } from "./world-coords";

/** Call when store target is written. */
export function onStoreTargetChanged(
  t: WorldPoint | null,
  reason = "store:target",
) {
  if (!t) {
    clearMovementCommand();
    return;
  }
  issueFromStoreTarget(t, reason);
}

export function onWanderGoal(target: WorldPoint, reason = "goal:wander") {
  issueMovementCommand({
    target,
    mode: "walk",
    speed: 1,
    urgency: 0.55,
    interruptible: true,
    reason,
    ttlMs: 14_000,
  });
}

export function onGoHome(home?: WorldPoint, reason = "director:goHome") {
  const h = home ?? { x: 1.05, y: -0.72 };
  issueReturnHome(h, reason);
  return h;
}
