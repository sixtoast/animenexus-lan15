/**
 * Lantern contextual reactions (Sprint 7 + Sprint 29).
 *
 * Map Nexus events → restrained reactions:
 *   search → curious
 *   seal / accept → pleased
 *   completion → celebration
 *   reject / drop → soft concern
 *   tool/challenge → excitement
 *   idle drift stays ambient (no spam)
 *
 * Cooldowns keep Lantern ambient, not needy.
 * Respects prefers-reduced-motion for animation requests.
 */

import { emitNexus, subscribeNexus } from "@/lib/nexus";
import type { NexusEvent } from "@/lib/nexus/events";
import { useMascotStore } from "./store";
import type { MascotEmotions } from "./types";
import type { MascotAnim } from "./types";

let unsub: (() => void) | null = null;

/** Global minimum gap between any two reaction animations. */
const GLOBAL_COOLDOWN_MS = 2_400;

/** Per-reaction-kind cooldown (ms). */
const KIND_COOLDOWN_MS: Record<string, number> = {
  curious: 8_000,
  pleased: 6_000,
  celebrate: 12_000,
  concern: 10_000,
  excite: 9_000,
  think: 7_000,
};

let lastGlobalFire = 0;
const lastKindFire = new Map<string, number>();

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.nxMotion === "reduced") return true;
  if (document.documentElement.getAttribute("data-reduce-motion") === "true")
    return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function canFire(kind: string, force = false): boolean {
  const now = Date.now();
  if (!force && now - lastGlobalFire < GLOBAL_COOLDOWN_MS) return false;
  const kindCd = KIND_COOLDOWN_MS[kind] ?? 6_000;
  const last = lastKindFire.get(kind) ?? 0;
  if (!force && now - last < kindCd) return false;
  lastGlobalFire = now;
  lastKindFire.set(kind, now);
  return true;
}

function softAnim(anim: MascotAnim, holdMs: number, kind: string, force = false) {
  if (prefersReducedMotion()) return;
  if (!canFire(kind, force)) return;
  useMascotStore.getState().requestAnim({ anim, holdMs });
  try {
    emitNexus({ type: "lantern_reaction", reaction: kind });
  } catch {
    /* bus optional */
  }
}

function lanternMoodBias(): Partial<Record<keyof MascotEmotions, number>> {
  if (typeof document === "undefined") return {};
  const mood = document.documentElement.dataset.nxLantern;
  switch (mood) {
    case "relaxed":
      return { sleepiness: 0.02, stress: -0.02, energy: -0.01 };
    case "curious":
      return { curiosity: 0.03, attention: 0.02 };
    case "focused":
      return { attention: 0.03, curiosity: 0.01, boredom: -0.02 };
    case "celebratory":
      return { happiness: 0.04, energy: 0.03 };
    case "concerned":
      return { stress: 0.03, confidence: -0.02 };
    default:
      return {};
  }
}

function applyBias() {
  const bias = lanternMoodBias();
  const store = useMascotStore.getState();
  for (const [k, v] of Object.entries(bias)) {
    if (v) store.bumpEmotion(k as keyof MascotEmotions, v);
  }
}

function onEvent(ev: NexusEvent): void {
  const store = useMascotStore.getState();
  applyBias();

  switch (ev.type) {
    case "search_performed":
      store.bumpEmotion("curiosity", 0.08);
      store.bumpEmotion("attention", 0.06);
      store.dispatch({ type: "context", context: "browsing" });
      softAnim("point", 1100, "curious");
      break;

    case "anime_viewed":
      store.bumpEmotion("curiosity", 0.06);
      store.bumpEmotion("attention", 0.08);
      store.bumpEmotion("boredom", -0.04);
      store.dispatch({ type: "context", context: "browsing" });
      softAnim("point", 900, "curious");
      break;

    case "anime_hovered":
      // Emotion only — no anim (avoids spam)
      store.bumpEmotion("attention", 0.03);
      store.bumpEmotion("curiosity", 0.02);
      break;

    case "anime_added":
      store.dispatch({ type: "seal" });
      store.bumpEmotion("happiness", 0.12);
      store.bumpEmotion("attention", 0.05);
      softAnim("happy", 1400, "pleased", true);
      break;

    case "recommendation_accepted":
      store.bumpEmotion("happiness", 0.12);
      store.bumpEmotion("confidence", 0.06);
      store.bumpEmotion("energy", 0.05);
      softAnim("happy", 1600, "pleased", true);
      break;

    case "anime_completed":
      store.dispatch({ type: "complete" });
      store.bumpEmotion("happiness", 0.14);
      store.bumpEmotion("confidence", 0.08);
      store.bumpEmotion("energy", 0.06);
      softAnim("celebrate", 2200, "celebrate", true);
      break;

    case "anime_removed":
    case "anime_dropped":
      store.bumpEmotion("curiosity", 0.04);
      store.bumpEmotion("happiness", -0.03);
      softAnim("think", 1200, "think");
      break;

    case "recommendation_rejected":
      store.bumpEmotion("curiosity", 0.05);
      store.bumpEmotion("happiness", -0.02);
      softAnim("think", 1400, "concern");
      break;

    case "filter_used":
      store.bumpEmotion("curiosity", 0.04);
      break;

    case "tool_opened": {
      store.bumpEmotion("attention", 0.07);
      store.bumpEmotion("energy", 0.04);
      store.dispatch({ type: "context", context: "browsing" });
      const tool = (ev.tool || "").toLowerCase();
      if (tool.includes("challenge")) {
        softAnim("jump", 700, "excite");
      } else if (tool.includes("oracle") || tool.includes("radar")) {
        softAnim("point", 1000, "curious");
      } else {
        softAnim("wave", 800, "pleased");
      }
      break;
    }

    case "page_viewed":
      store.bumpEmotion("attention", 0.03);
      break;

    case "recommendation_shown":
      store.bumpEmotion("curiosity", 0.04);
      store.bumpEmotion("attention", 0.03);
      break;

    case "recommendation_opened":
      store.bumpEmotion("curiosity", 0.08);
      store.bumpEmotion("attention", 0.1);
      store.bumpEmotion("happiness", 0.04);
      softAnim("point", 1000, "curious");
      break;

    case "session_started":
      store.bumpEmotion("energy", 0.04);
      break;

    case "session_ended":
      store.bumpEmotion("sleepiness", 0.04);
      store.bumpEmotion("energy", -0.03);
      break;

    default:
      break;
  }
}

/**
 * Signal failure → restrained concern (Sprint 29).
 * Call from SignalError mount / retry failure paths.
 */
export function lanternReactConcern(source = "error"): void {
  const store = useMascotStore.getState();
  store.bumpEmotion("stress", 0.08);
  store.bumpEmotion("confidence", -0.04);
  softAnim("surprised", 900, "concern");
  try {
    emitNexus({ type: "lantern_reaction", reaction: `concern:${source}` });
  } catch {
    /* */
  }
}

/** Idempotent install from LiveTerrain / shell. */
export function installNexusAttentionBridge(): void {
  if (typeof window === "undefined") return;
  if (unsub) return;
  unsub = subscribeNexus(onEvent);
}

export function uninstallNexusAttentionBridge(): void {
  unsub?.();
  unsub = null;
}
