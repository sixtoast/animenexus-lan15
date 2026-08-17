/** Mascot Engine — shared types */

import { HABITAT_BOUNDS as WORLD_HABITAT_BOUNDS } from "./world-coords";

export type MascotAnim =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "land"
  | "happy"
  | "wave"
  | "think"
  | "sleep"
  | "surprised"
  | "point"
  | "sit"
  | "stretch"
  | "nod"
  | "shy"
  | "celebrate"
  | "bow";

export type MascotEmotions = {
  curiosity: number;
  energy: number;
  happiness: number;
  boredom: number;
  sleepiness: number;
  attention: number;
  confidence: number;
  stress: number;
};

export type MascotContext =
  | "idle"
  | "loading"
  | "empty-list"
  | "error"
  | "browsing"
  | "watching";

/**
 * Movement events use page-world coordinates.
 * `y` is preferred; `z` is accepted as a legacy alias for the same axis.
 */
export type MascotEvent =
  | { type: "pet" }
  | { type: "click" }
  | { type: "seal" }
  | { type: "complete" }
  | { type: "route"; path: string }
  | { type: "idle-long" }
  | { type: "go-to"; x: number; y?: number; z?: number }
  | { type: "climb"; x: number; y?: number; z?: number }
  | { type: "drag"; x: number; y?: number; z?: number }
  | { type: "tick" }
  | { type: "notice-ui"; landmarkId?: string }
  | { type: "ui-hover"; clientX: number; clientY: number }
  | { type: "cursor-move"; clientX: number; clientY: number }
  | { type: "jump" }
  | { type: "context"; context: MascotContext }
  | { type: "loading"; active: boolean }
  | { type: "error" }
  | { type: "empty-list" }
  | { type: "theme"; theme: "dark" | "light" }
  | { type: "scroll-fast" }
  | { type: "skit" }
  | {
      type: "app-event";
      name:
        | "recommendation-generated"
        | "recommendation-engaged"
        | "recommendation-rejected"
        | "watchlist-add"
        | "watchlist-remove"
        | "search-empty"
        | "search-results"
        | "loading-long"
        | "modal-open"
        | "modal-close"
        | "page-view"
        | "anime-open"
        | "daily-checkin"
        | "fusion-result"
        | "challenge-complete"
        | "night-mode"
        | "first-visit"
        | "pet-long";
    };

/** @deprecated Prefer WORLD_BOUNDS from world-coords for live path */
export const HABITAT_BOUNDS = WORLD_HABITAT_BOUNDS;

/** Normalize event axis: prefer y, fall back to legacy z. */
export function eventAxisY(e: { y?: number; z?: number }): number {
  if (typeof e.y === "number") return e.y;
  if (typeof e.z === "number") return e.z;
  return 0;
}
