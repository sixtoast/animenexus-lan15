/** Mascot Engine — shared types */

export type MascotAnim =
  | "idle"
  | "walk"
  | "jump"
  | "land"
  | "happy"
  | "wave"
  | "think"
  | "sleep"
  | "surprised"
  | "point";

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

export type MascotEvent =
  | { type: "pet" }
  | { type: "click" }
  | { type: "seal" }
  | { type: "complete" }
  | { type: "route"; path: string }
  | { type: "idle-long" }
  | { type: "go-to"; x: number; z: number }
  | { type: "climb"; x: number; z: number }
  | { type: "drag"; x: number; z: number }
  | { type: "tick" }
  | { type: "notice-ui"; landmarkId?: string }
  | { type: "ui-hover"; clientX: number; clientY: number }
  | { type: "jump" }
  | { type: "context"; context: MascotContext }
  | { type: "loading"; active: boolean }
  | { type: "error" }
  | { type: "empty-list" }
  | { type: "theme"; theme: "dark" | "light" }
  | { type: "scroll-fast" }
  | { type: "skit" };

export const HABITAT_BOUNDS = {
  minX: -0.55,
  maxX: 0.55,
  minZ: -0.25,
  maxZ: 0.25,
} as const;
