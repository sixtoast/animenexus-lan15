/**
 * Sprint 4 — UI as stage directions
 * Maps landmark types → performance (sit, inspect, hide, lean…).
 */

import type { TerrainPlatform } from "./page-terrain";
import type { ReactionIntent } from "./personality";
import type { MascotAnim } from "./types";

export type TheatreMove =
  | "sit-edge"
  | "inspect"
  | "hide-behind"
  | "lean"
  | "surf"
  | "climb-modal"
  | "wave-from"
  | "perch";

export type TheatreBeat = {
  move: TheatreMove;
  anim: MascotAnim;
  holdMs: number;
  /** Offset on platform: top edge, center, behind */
  pose: "top" | "center" | "behind" | "side";
  intent?: ReactionIntent;
  thought?: string;
};

export function theatreForPlatform(p: TerrainPlatform): TheatreBeat {
  switch (p.type) {
    case "card":
      return {
        move: Math.random() < 0.55 ? "sit-edge" : "perch",
        anim: Math.random() < 0.4 ? "point" : "idle",
        holdMs: 2200 + Math.random() * 1800,
        pose: "top",
        intent: "curious",
        thought: "This one looks promising.",
      };
    case "button":
      return {
        move: "lean",
        anim: "think",
        holdMs: 1400,
        pose: "side",
        thought: "Push…?",
      };
    case "nav":
      return {
        move: "surf",
        anim: "walk",
        holdMs: 1600,
        pose: "top",
        thought: "Along the rail.",
      };
    case "modal":
      return {
        move: "climb-modal",
        anim: "surprised",
        holdMs: 900,
        pose: "top",
        intent: "curious",
        thought: "Big window…",
      };
    case "hero":
      return {
        move: "inspect",
        anim: "point",
        holdMs: 2000,
        pose: "center",
        thought: "Headline glow.",
      };
    case "search":
      return {
        move: "inspect",
        anim: "think",
        holdMs: 1800,
        pose: "center",
        thought: "What’s inside the box?",
      };
    default:
      if (p.priority >= 7) {
        return {
          move: "hide-behind",
          anim: "think",
          holdMs: 1500,
          pose: "behind",
          thought: "Tucked away.",
        };
      }
      return {
        move: "perch",
        anim: "idle",
        holdMs: 1600,
        pose: "top",
      };
  }
}

/** World offset on a platform for a pose */
export function poseOnPlatform(
  p: TerrainPlatform,
  pose: TheatreBeat["pose"],
): { x: number; y: number } {
  switch (pose) {
    case "top":
      return { x: p.x + (Math.random() - 0.5) * p.hw * 0.4, y: p.y + p.hh };
    case "center":
      return { x: p.x, y: p.y + p.hh * 0.3 };
    case "behind":
      return { x: p.x - p.hw * 0.35, y: p.y + p.hh * 0.2 };
    case "side":
      return { x: p.x + p.hw * 0.7, y: p.y + p.hh * 0.5 };
    default:
      return { x: p.x, y: p.y + p.hh };
  }
}

export function modalOpenedBeat(): TheatreBeat {
  return {
    move: "climb-modal",
    anim: "jump",
    holdMs: 600,
    pose: "top",
    intent: "curious",
    thought: "Something opened…",
  };
}

export function modalClosedBeat(): TheatreBeat {
  return {
    move: "hide-behind",
    anim: "surprised",
    holdMs: 500,
    pose: "behind",
    thought: "—oof.",
  };
}
