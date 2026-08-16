/**
 * Write store target + MovementCommand together (Sprint 3).
 */

import {
  clearMovementCommand,
  issueFromStoreTarget,
  issueReturnHome,
  type IssueMovementOpts,
} from "./movement-command";
import type { WorldPoint } from "./world-coords";
import { useMascotStore } from "./store";

export function commitTarget(
  t: WorldPoint | null,
  reason = "commitTarget",
  platformId?: string,
) {
  useMascotStore.setState({ target: t });
  if (t) issueFromStoreTarget(t, reason, platformId);
  else clearMovementCommand();
}

export function commitReturnHome(home: WorldPoint, reason = "director:goHome") {
  useMascotStore.setState({ target: home, goal: "ponder" });
  issueReturnHome(home, reason);
}

export function commitMove(
  t: WorldPoint,
  opts?: Partial<IssueMovementOpts> & { reason?: string },
) {
  useMascotStore.setState({ target: t, goal: "wander" });
  issueFromStoreTarget(t, opts?.reason ?? "commitMove", opts?.platformId);
}
