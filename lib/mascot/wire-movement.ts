/**
 * Sprint 4–5 — ensure store goals/targets become MovementCommands
 * and outing intentions resolve to real landmarks.
 */

import { useMascotStore } from "./store";
import { onGoHome, onStoreTargetChanged, onWanderGoal } from "./brain-move";
import { issueForIntention } from "./brain-targets";
import { randomWanderTarget } from "./navigation";
import { runtimeIsBusyMoving } from "./runtime";

let wired = false;

export function wireStoreMovement() {
  if (wired || typeof window === "undefined") return;
  wired = true;

  const state = useMascotStore.getState();
  const origSetTarget = state.setTarget;
  const origApplyGoal = state.applyGoal;

  useMascotStore.setState({
    setTarget: (t) => {
      origSetTarget(t);
      onStoreTargetChanged(t, "wired:setTarget");
    },
    applyGoal: (goal) => {
      origApplyGoal(goal);
      if (goal === "wander") {
        const intention = useMascotStore.getState().intention;
        const fromIntention = issueForIntention(
          intention,
          "wired:wander-intention",
        );
        if (fromIntention) {
          origSetTarget(fromIntention);
        } else {
          const t =
            useMascotStore.getState().target ?? randomWanderTarget();
          onWanderGoal(t, "wired:wander");
          origSetTarget(t);
        }
      }
      if (goal === "nap" || goal === "ponder") {
        const h = onGoHome(undefined, `wired:${goal}`);
        origSetTarget(h);
      }
    },
  });

  const origTick = useMascotStore.getState().runBehaviourTick;
  useMascotStore.setState({
    runBehaviourTick: () => {
      // Don't stack outings while body is already moving
      if (runtimeIsBusyMoving()) {
        useMascotStore.setState({
          nextThinkAt: Date.now() + 1500,
        });
        return;
      }

      const beforeReason = useMascotStore.getState().lastDirectorReason;
      const beforeIntention = useMascotStore.getState().intention;
      origTick();
      const after = useMascotStore.getState();

      if (
        (after.intention === "sleep" || after.intention === "rest") &&
        !after.target &&
        after.lastDirectorReason !== beforeReason
      ) {
        const h = onGoHome(undefined, after.lastDirectorReason ?? "wired:home");
        after.setTarget(h);
        return;
      }

      // New outing intention without a target → pick landmark
      const outing =
        after.intention === "explore" ||
        after.intention === "investigate" ||
        after.intention === "inspect-recommendation" ||
        after.intention === "interact-ui" ||
        after.intention === "guide" ||
        after.intention === "play";

      if (
        outing &&
        after.intention !== beforeIntention &&
        !after.target
      ) {
        const pt = issueForIntention(
          after.intention,
          after.lastDirectorReason ?? "wired:intention",
        );
        if (pt) after.setTarget(pt);
      }
    },
  });
}
