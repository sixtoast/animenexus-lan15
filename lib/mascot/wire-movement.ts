/**
 * Sprint 4 — ensure every setTarget also issues a MovementCommand.
 * Called once from LiveTerrain mount (avoids large store rewrite).
 */

import { useMascotStore } from "./store";
import { onGoHome, onStoreTargetChanged, onWanderGoal } from "./brain-move";
import { randomWanderTarget } from "./navigation";

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
        const t = useMascotStore.getState().target ?? randomWanderTarget();
        onWanderGoal(t, "wired:wander");
      }
      if (goal === "nap" || goal === "ponder") {
        const h = onGoHome(undefined, `wired:${goal}`);
        origSetTarget(h);
      }
    },
  });

  // Wrap behaviour tick to honor goHome from director
  const origTick = useMascotStore.getState().runBehaviourTick;
  useMascotStore.setState({
    runBehaviourTick: () => {
      const before = useMascotStore.getState().lastDirectorReason;
      origTick();
      const after = useMascotStore.getState();
      // If director just chose rest/sleep with no target, nudge home
      if (
        (after.intention === "sleep" || after.intention === "rest") &&
        !after.target &&
        after.lastDirectorReason !== before
      ) {
        const h = onGoHome(undefined, after.lastDirectorReason ?? "wired:home");
        after.setTarget(h);
      }
    },
  });
}
