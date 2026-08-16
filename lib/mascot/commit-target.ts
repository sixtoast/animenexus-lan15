/**
 * MovementCommand issue helpers used by the store (Sprint 3).
 * Do not import the Zustand store from here.
 */

import {
  clearMovementCommand,
  issueFromStoreTarget,
  issueReturnHome,
} from "./movement-command";
import type { WorldPoint } from "./world-coords";

export function issueTargetCommand(
  t: WorldPoint | null,
  reason = "store:target",
  platformId?: string,
) {
  if (t) issueFromStoreTarget(t, reason, platformId);
  else clearMovementCommand();
}

export function issueHomeCommand(home: WorldPoint, reason = "director:goHome") {
  return issueReturnHome(home, reason);
}
