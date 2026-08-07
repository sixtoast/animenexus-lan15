/**
 * Map personality ReactionIntent → concrete store effects.
 * Keeps Sprint 1 identity wired without rewriting the whole engine.
 */

import type { ReactionIntent } from "./personality";
import type { MascotAnim } from "./types";

export type ReactionPlan = {
  anim: MascotAnim;
  holdMs: number;
  follow?: { anim: MascotAnim; holdMs: number };
  emotionDeltas: Partial<{
    curiosity: number;
    energy: number;
    happiness: number;
    boredom: number;
    sleepiness: number;
    attention: number;
    confidence: number;
    stress: number;
  }>;
  /** Optional spoken line key from COMPANION.voice.lines */
  lineKey?: keyof typeof import("./personality").COMPANION.voice.lines;
};

export function planReaction(intent: ReactionIntent): ReactionPlan {
  switch (intent) {
    case "hide":
      return {
        anim: "surprised",
        holdMs: 500,
        follow: { anim: "think", holdMs: 2200 },
        emotionDeltas: { stress: 0.25, confidence: -0.1, curiosity: -0.05 },
        lineKey: "horror",
      };
    case "blush":
      return {
        anim: "happy",
        holdMs: 900,
        emotionDeltas: { happiness: 0.15, attention: 0.1, stress: 0.05 },
        lineKey: "romance",
      };
    case "pilot":
      return {
        anim: "point",
        holdMs: 800,
        follow: { anim: "jump", holdMs: 400 },
        emotionDeltas: { curiosity: 0.12, energy: 0.1, confidence: 0.08 },
      };
    case "celebrate":
      return {
        anim: "jump",
        holdMs: 400,
        follow: { anim: "happy", holdMs: 1000 },
        emotionDeltas: { happiness: 0.22, energy: 0.12, confidence: 0.1 },
      };
    case "curious":
      return {
        anim: "point",
        holdMs: 1200,
        emotionDeltas: { curiosity: 0.15, attention: 0.12, boredom: -0.1 },
        lineKey: "found",
      };
    case "shy_wave":
      return {
        anim: "wave",
        holdMs: 900,
        emotionDeltas: { happiness: 0.08, attention: 0.1, stress: -0.05 },
        lineKey: "pet",
      };
    case "point":
      return {
        anim: "point",
        holdMs: 1000,
        emotionDeltas: { curiosity: 0.1, attention: 0.1 },
        lineKey: "found",
      };
    case "nap":
      return {
        anim: "sleep",
        holdMs: 0,
        emotionDeltas: { sleepiness: 0.2, energy: -0.1 },
      };
    case "stretch":
      return {
        anim: "jump",
        holdMs: 350,
        follow: { anim: "idle", holdMs: 0 },
        emotionDeltas: { energy: 0.08, sleepiness: -0.1 },
      };
    case "complain":
      return {
        anim: "surprised",
        holdMs: 500,
        emotionDeltas: { stress: 0.12, attention: 0.08 },
      };
    case "trust":
      return {
        anim: "happy",
        holdMs: 1100,
        emotionDeltas: {
          happiness: 0.16,
          confidence: 0.1,
          stress: -0.12,
          boredom: -0.15,
        },
        lineKey: "pet",
      };
    default:
      return {
        anim: "idle",
        holdMs: 0,
        emotionDeltas: {},
      };
  }
}
