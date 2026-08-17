/**
 * Sprint 12 — UI event reactions
 *
 * Map semantic app events to intention, emotion, anim, and optional UI approach.
 */

import type { MascotAnim, MascotEmotions } from "./types";
import type { MascotIntention } from "./director";
import type { MascotGoal } from "./behaviour";
import type { LandmarkType } from "./ui-registry";

/** Semantic events the app (or bridges) may emit */
export type AppUiEvent =
  | "recommendation-generated"
  | "recommendation-engaged"
  | "recommendation-rejected"
  | "watchlist-add"
  | "watchlist-remove"
  | "search-empty"
  | "search-results"
  | "loading-long"
  | "error"
  | "modal-open"
  | "modal-close"
  | "scroll-fast"
  | "seal"
  | "complete"
  | "empty-list"
  | "page-view"
  | "anime-open"
  | "daily-checkin"
  | "fusion-result"
  | "challenge-complete"
  | "night-mode"
  | "first-visit"
  | "pet-long";

export type UiEventReaction = {
  intention: MascotIntention;
  emotionDeltas: Partial<MascotEmotions>;
  anim?: MascotAnim;
  holdMs?: number;
  goal?: MascotGoal;
  preferLandmark?: LandmarkType;
  approachUi?: boolean;
  thought?: string;
  cooldownMs: number;
};

const REACTIONS: Record<AppUiEvent, UiEventReaction> = {
  "recommendation-generated": {
    intention: "inspect-recommendation",
    emotionDeltas: { curiosity: 0.12, attention: 0.1, boredom: -0.08 },
    anim: "point",
    holdMs: 1200,
    goal: "wander",
    preferLandmark: "card",
    approachUi: true,
    thought: "Something for you.",
    cooldownMs: 8_000,
  },
  "recommendation-engaged": {
    intention: "celebrate",
    emotionDeltas: { happiness: 0.14, confidence: 0.06, curiosity: 0.04 },
    anim: "celebrate",
    holdMs: 1200,
    goal: "celebrate",
    thought: "Good pick.",
    cooldownMs: 5_000,
  },
  "recommendation-rejected": {
    intention: "observe",
    emotionDeltas: { happiness: -0.04, curiosity: 0.06, boredom: 0.03 },
    anim: "think",
    holdMs: 1100,
    thought: "Not that one… okay.",
    cooldownMs: 4_000,
  },
  "watchlist-add": {
    intention: "celebrate",
    emotionDeltas: { happiness: 0.12, energy: 0.06 },
    anim: "jump",
    holdMs: 450,
    goal: "celebrate",
    thought: "On the list.",
    cooldownMs: 5_000,
  },
  "watchlist-remove": {
    intention: "observe",
    emotionDeltas: { attention: 0.04 },
    anim: "nod",
    holdMs: 800,
    cooldownMs: 4_000,
  },
  "search-empty": {
    intention: "observe",
    emotionDeltas: { curiosity: 0.05, boredom: 0.06, stress: 0.03 },
    anim: "think",
    holdMs: 1400,
    thought: "Nothing here…",
    cooldownMs: 6_000,
  },
  "search-results": {
    intention: "investigate",
    emotionDeltas: { curiosity: 0.1, attention: 0.08 },
    anim: "point",
    holdMs: 1000,
    preferLandmark: "search",
    approachUi: true,
    thought: "Signals.",
    cooldownMs: 5_000,
  },
  "loading-long": {
    intention: "rest",
    emotionDeltas: { boredom: 0.12, sleepiness: 0.08, energy: -0.06 },
    anim: "sit",
    holdMs: 2500,
    thought: "Still loading…",
    cooldownMs: 10_000,
  },
  error: {
    intention: "hide",
    emotionDeltas: { stress: 0.18, confidence: -0.08, happiness: -0.05 },
    anim: "surprised",
    holdMs: 900,
    thought: "Whoa.",
    cooldownMs: 5_000,
  },
  "modal-open": {
    intention: "investigate",
    emotionDeltas: { curiosity: 0.1, attention: 0.1 },
    anim: "point",
    holdMs: 900,
    preferLandmark: "modal",
    approachUi: true,
    thought: "A stage.",
    cooldownMs: 6_000,
  },
  "modal-close": {
    intention: "observe",
    emotionDeltas: { attention: -0.04 },
    anim: "wave",
    holdMs: 700,
    cooldownMs: 4_000,
  },
  "scroll-fast": {
    intention: "hide",
    emotionDeltas: { stress: 0.1 },
    anim: "surprised",
    holdMs: 500,
    cooldownMs: 3_000,
  },
  seal: {
    intention: "celebrate",
    emotionDeltas: { happiness: 0.15, energy: 0.08 },
    anim: "jump",
    holdMs: 400,
    goal: "celebrate",
    cooldownMs: 5_000,
  },
  complete: {
    intention: "celebrate",
    emotionDeltas: { happiness: 0.18, confidence: 0.08 },
    anim: "celebrate",
    holdMs: 1200,
    goal: "celebrate",
    thought: "Finished.",
    cooldownMs: 5_000,
  },
  "empty-list": {
    intention: "observe",
    emotionDeltas: { curiosity: 0.06, boredom: 0.05 },
    anim: "think",
    holdMs: 1500,
    thought: "Empty shelf.",
    cooldownMs: 8_000,
  },
  "page-view": {
    intention: "observe",
    emotionDeltas: { curiosity: 0.04, attention: 0.05 },
    anim: "nod",
    holdMs: 700,
    thought: "New page.",
    cooldownMs: 4_000,
  },
  "anime-open": {
    intention: "inspect-recommendation",
    emotionDeltas: { curiosity: 0.12, attention: 0.12, happiness: 0.06 },
    anim: "point",
    holdMs: 1100,
    preferLandmark: "hero",
    approachUi: true,
    thought: "This one…",
    cooldownMs: 6_000,
  },
  "daily-checkin": {
    intention: "greet",
    emotionDeltas: { happiness: 0.1, energy: 0.08 },
    anim: "wave",
    holdMs: 1100,
    thought: "You’re back.",
    cooldownMs: 12_000,
  },
  "fusion-result": {
    intention: "celebrate",
    emotionDeltas: { happiness: 0.12, curiosity: 0.1, energy: 0.08 },
    anim: "celebrate",
    holdMs: 1400,
    goal: "celebrate",
    thought: "Fusion!",
    cooldownMs: 8_000,
  },
  "challenge-complete": {
    intention: "celebrate",
    emotionDeltas: { happiness: 0.16, confidence: 0.12, energy: 0.1 },
    anim: "celebrate",
    holdMs: 1600,
    goal: "celebrate",
    thought: "Challenge clear!",
    cooldownMs: 10_000,
  },
  "night-mode": {
    intention: "rest",
    emotionDeltas: { sleepiness: 0.1, energy: -0.06 },
    anim: "stretch",
    holdMs: 1400,
    thought: "Dim lights…",
    cooldownMs: 8_000,
  },
  "first-visit": {
    intention: "greet",
    emotionDeltas: { curiosity: 0.1, happiness: 0.08 },
    anim: "bow",
    holdMs: 1300,
    thought: "Hello.",
    cooldownMs: 30_000,
  },
  "pet-long": {
    intention: "greet",
    emotionDeltas: { happiness: 0.14, stress: -0.1, confidence: 0.05 },
    anim: "shy",
    holdMs: 1500,
    thought: "…soft.",
    cooldownMs: 6_000,
  },
};

const lastFired = new Map<AppUiEvent, number>();

export function reactionForAppEvent(event: AppUiEvent): UiEventReaction | null {
  const base = REACTIONS[event];
  if (!base) return null;
  const last = lastFired.get(event) ?? 0;
  if (Date.now() - last < base.cooldownMs) return null;
  lastFired.set(event, Date.now());
  return { ...base };
}

export function parseAppEventName(name: string): AppUiEvent | null {
  const n = name.replace(/^animenexus:/, "").toLowerCase();
  const map: Record<string, AppUiEvent> = {
    "recommendation-generated": "recommendation-generated",
    recommendation: "recommendation-generated",
    "recs-ready": "recommendation-generated",
    "recommendation-engaged": "recommendation-engaged",
    "rec-click": "recommendation-engaged",
    "recommendation-rejected": "recommendation-rejected",
    "rec-dismiss": "recommendation-rejected",
    "watchlist-add": "watchlist-add",
    "watchlist:add": "watchlist-add",
    "watchlist-remove": "watchlist-remove",
    "search-empty": "search-empty",
    "search-results": "search-results",
    "loading-long": "loading-long",
    error: "error",
    "modal-open": "modal-open",
    "modal-close": "modal-close",
    "scroll-fast": "scroll-fast",
    seal: "seal",
    complete: "complete",
    "empty-list": "empty-list",
    "page-view": "page-view",
    pageview: "page-view",
    "anime-open": "anime-open",
    "anime:open": "anime-open",
    "daily-checkin": "daily-checkin",
    daily: "daily-checkin",
    "fusion-result": "fusion-result",
    fusion: "fusion-result",
    "challenge-complete": "challenge-complete",
    challenge: "challenge-complete",
    "night-mode": "night-mode",
    night: "night-mode",
    "first-visit": "first-visit",
    welcome: "first-visit",
    "pet-long": "pet-long",
    "long-pet": "pet-long",
  };
  return map[n] ?? null;
}
