/**
 * Sprint 15 — Physics & safety
 *
 * Hard constraints so Lantern-ko never:
 * - permanently leaves the viewport
 * - becomes unreachable
 * - climbs invisible / closed / off-screen elements
 * - gets trapped behind UI
 * - sticks in a physics loop
 */

import { clampToHabitat, type NavTarget } from "./navigation";
import { HABITAT_BOUNDS } from "./types";
import type { ClimbState } from "./climbing";
import { isClimbing, isSafeClimbTarget } from "./climbing";
import type { Landmark } from "./ui-registry";
import { listLandmarks, refreshLandmarkRects } from "./ui-registry";

export const HOME_SPOT: NavTarget = { x: 0.32, y: 0.08 };

/** Habitat home — always reachable */
export function homeTarget(): NavTarget {
  return clampToHabitat(HOME_SPOT.x, HOME_SPOT.y);
}

/** Clamp position every frame / tick */
export function safePosition(p: NavTarget): NavTarget {
  return clampToHabitat(p.x, p.y);
}

/** True if target is outside habitat bounds */
export function isOutOfBounds(p: NavTarget, margin = 0.02): boolean {
  return (
    p.x < HABITAT_BOUNDS.minX - margin ||
    p.x > HABITAT_BOUNDS.maxX + margin ||
    p.y < HABITAT_BOUNDS.minZ - margin ||
    p.y > HABITAT_BOUNDS.maxZ + margin
  );
}

/** Filter platforms that are legal climb surfaces right now */
export function visibleClimbablePlatforms(): Landmark[] {
  refreshLandmarkRects();
  return listLandmarks().filter(isSafeClimbTarget);
}

export type SafetyVerdict =
  | { ok: true }
  | { ok: false; action: "clamp" | "return-home" | "abort-climb"; reason: string };

/**
 * Evaluate whether current pose / climb is safe.
 * Call from tick or after navigation steps.
 */
export function evaluateSafety(input: {
  position: NavTarget;
  climb: ClimbState;
  msClimbing?: number;
}): SafetyVerdict {
  const { position, climb } = input;

  if (isOutOfBounds(position)) {
    return { ok: false, action: "return-home", reason: "out of habitat bounds" };
  }

  // Climbing too long → force dismount
  if (isClimbing(climb)) {
    const elapsed = Date.now() - (climb.startedAt || Date.now());
    if (elapsed > 14_000) {
      return { ok: false, action: "abort-climb", reason: "climb timeout" };
    }
    // Surface disappeared / became unsafe
    if (climb.landmarkId) {
      const platforms = visibleClimbablePlatforms();
      const still = platforms.some((p) => p.id === climb.landmarkId);
      if (!still) {
        return {
          ok: false,
          action: "abort-climb",
          reason: "surface gone or unsafe",
        };
      }
    }
  }

  return { ok: true };
}

export type SafetyRunner = {
  setPosition: (p: NavTarget) => void;
  setTarget: (t: NavTarget | null) => void;
  requestAnim: (req: {
    anim: "walk" | "idle" | "surprised";
    holdMs?: number;
    force?: boolean;
  }) => boolean;
  setThought: (t: string) => void;
  abortClimb: () => void;
};

/** Apply safety verdict */
export function enforceSafety(
  verdict: SafetyVerdict,
  runner: SafetyRunner,
  position: NavTarget,
): void {
  if (verdict.ok) return;

  switch (verdict.action) {
    case "clamp":
      runner.setPosition(safePosition(position));
      break;
    case "return-home": {
      const home = homeTarget();
      runner.setPosition(home);
      runner.setTarget(home);
      runner.requestAnim({ anim: "walk", force: true });
      runner.setThought("Home.");
      break;
    }
    case "abort-climb":
      runner.abortClimb();
      runner.setTarget(homeTarget());
      runner.requestAnim({ anim: "surprised", holdMs: 400, force: true });
      runner.setThought("Whoa—");
      break;
  }
}

/** On resize / orientation change — snap into habitat */
export function onViewportResize(position: NavTarget): NavTarget {
  return safePosition(position);
}
