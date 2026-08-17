/**
 * Sprint 5 — Map Director intentions to concrete page-world targets.
 * Keeps destination choice in the brain, not in Actor.
 */

import {
  landmarkToWorld,
  listByType,
  pickInterestingLandmark,
  type LandmarkType,
} from "./ui-registry";
import type { MascotIntention } from "./director";
import type { WorldPoint } from "./world-coords";
import { issueMovementCommand, issueReturnHome } from "./movement-command";

function homePoint(): WorldPoint {
  if (typeof window === "undefined") return { x: 1.05, y: -0.72 };
  const aspect = window.innerWidth / (window.innerHeight || 1);
  return { x: Math.min(aspect * 0.78, 1.32), y: -0.72 };
}

function preferTypes(intention: MascotIntention): LandmarkType[] {
  switch (intention) {
    case "inspect-recommendation":
    case "guide":
      return ["card", "carousel", "rail", "hero"];
    case "investigate":
    case "interact-ui":
      return ["modal", "card", "search", "button", "hero"];
    case "explore":
    case "play":
      return ["card", "hero", "rail", "navbar", "button"];
    case "seek-attention":
    case "greet":
      return ["hero", "navbar", "card"];
    default:
      return [];
  }
}

/** Pick a live landmark target for an outing intention. */
export function targetForIntention(
  intention: MascotIntention,
): { point: WorldPoint; platformHint?: string; landmarkType?: string } | null {
  if (
    intention === "sleep" ||
    intention === "rest" ||
    intention === "hide" ||
    intention === "idle" ||
    intention === "observe"
  ) {
    return null;
  }

  if (intention === "celebrate") {
    // Stay near current / center-ish
    return { point: { x: 0, y: -0.2 } };
  }

  const types = preferTypes(intention);
  for (const t of types) {
    const pool = listByType(t).filter((l) => l.visible && l.open);
    if (pool.length) {
      const lm = pool[Math.floor(Math.random() * Math.min(4, pool.length))];
      const kind =
        lm.type === "modal"
          ? "header"
          : lm.type === "card" || lm.type === "hero"
            ? "thumb"
            : "center";
      const w = landmarkToWorld(lm, kind);
      if (w) {
        return {
          point: w,
          platformHint: lm.id,
          landmarkType: lm.type,
        };
      }
    }
  }

  const any = pickInterestingLandmark();
  if (any) {
    const w = landmarkToWorld(any, "center");
    if (w) {
      return {
        point: w,
        platformHint: any.id,
        landmarkType: any.type,
      };
    }
  }

  // Soft center wander if no landmarks scanned yet
  return {
    point: {
      x: (Math.random() - 0.5) * 0.8,
      y: -0.15 + Math.random() * 0.3,
    },
  };
}

/** Issue MovementCommand for intention if it needs travel. */
export function issueForIntention(
  intention: MascotIntention,
  reason: string,
): WorldPoint | null {
  if (
    intention === "sleep" ||
    intention === "rest" ||
    intention === "hide"
  ) {
    const h = homePoint();
    issueReturnHome(h, reason);
    return h;
  }

  const resolved = targetForIntention(intention);
  if (!resolved) return null;

  issueMovementCommand({
    target: resolved.point,
    platformId: resolved.platformHint,
    mode: intention === "play" ? "jump" : "walk",
    speed: intention === "play" ? 1.3 : 1,
    urgency: 0.6,
    interruptible: true,
    reason: `${reason}:${intention}`,
    ttlMs: 14_000,
  });
  return resolved.point;
}
