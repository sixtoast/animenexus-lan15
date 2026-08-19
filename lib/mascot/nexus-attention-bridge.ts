/**
 * Sprint 7 — Lantern agency / attention bridge
 *
 * Maps Nexus app events → mascot store (emotions + light intentions).
 * Soft bias from html[data-nx-lantern] (environment engine).
 * Cooldowns keep behavior ambient, not needy.
 */

import { subscribeNexus } from "@/lib/nexus";
import type { NexusEvent } from "@/lib/nexus/events";
import { useMascotStore } from "./store";
import type { MascotEmotions } from "./types";

let unsub: (() => void) | null = null;
let lastFire = 0;
const GLOBAL_COOLDOWN_MS = 2_200;

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
  const now = Date.now();
  if (now - lastFire < GLOBAL_COOLDOWN_MS) {
    if (
      ev.type !== "anime_added" &&
      ev.type !== "anime_completed" &&
      ev.type !== "recommendation_rejected" &&
      ev.type !== "recommendation_accepted"
    ) {
      return;
    }
  }
  lastFire = now;

  const store = useMascotStore.getState();
  applyBias();

  switch (ev.type) {
    case "anime_viewed":
      store.bumpEmotion("curiosity", 0.06);
      store.bumpEmotion("attention", 0.08);
      store.bumpEmotion("boredom", -0.04);
      store.dispatch({ type: "context", context: "browsing" });
      break;

    case "anime_hovered":
      store.bumpEmotion("attention", 0.03);
      store.bumpEmotion("curiosity", 0.02);
      break;

    case "anime_added":
      store.dispatch({ type: "seal" });
      store.bumpEmotion("happiness", 0.1);
      store.bumpEmotion("attention", 0.05);
      break;

    case "anime_completed":
      store.dispatch({ type: "complete" });
      store.bumpEmotion("happiness", 0.12);
      store.bumpEmotion("confidence", 0.06);
      break;

    case "anime_removed":
    case "anime_dropped":
      store.bumpEmotion("curiosity", 0.04);
      store.bumpEmotion("happiness", -0.03);
      break;

    case "search_performed":
      store.bumpEmotion("curiosity", 0.07);
      store.bumpEmotion("attention", 0.05);
      store.dispatch({ type: "context", context: "browsing" });
      break;

    case "filter_used":
      store.bumpEmotion("curiosity", 0.04);
      break;

    case "tool_opened":
      store.bumpEmotion("attention", 0.07);
      store.bumpEmotion("energy", 0.03);
      store.dispatch({ type: "context", context: "browsing" });
      break;

    case "page_viewed":
      store.bumpEmotion("attention", 0.03);
      break;

    case "recommendation_shown":
      store.bumpEmotion("curiosity", 0.05);
      store.bumpEmotion("attention", 0.04);
      break;

    case "recommendation_opened":
      store.bumpEmotion("curiosity", 0.08);
      store.bumpEmotion("attention", 0.1);
      store.bumpEmotion("happiness", 0.04);
      break;

    case "recommendation_accepted":
      store.bumpEmotion("happiness", 0.12);
      store.bumpEmotion("confidence", 0.06);
      store.bumpEmotion("energy", 0.05);
      store.requestAnim({ anim: "celebrate", holdMs: 2200 });
      break;

    case "recommendation_rejected":
      store.bumpEmotion("curiosity", 0.05);
      store.bumpEmotion("happiness", -0.02);
      store.requestAnim({ anim: "think", holdMs: 1600 });
      break;

    default:
      break;
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
