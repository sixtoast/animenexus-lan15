/**
 * Lantern cinematic staging (Awwwards Sprint 10).
 *
 * Reads Cinematography Director state — does not own product state.
 * Rules: quieter in Memory Room, attention to focus subject, never Clippy.
 */

import { subscribeNexus } from "@/lib/nexus";
import { useCinematographyStore } from "@/lib/cinematography-store";
import type { CinematicFocus } from "@/lib/cinematography";
import { useMascotStore } from "./store";

let unsubCinema: (() => void) | null = null;
let unsubNexus: (() => void) | null = null;
let lastFocus: CinematicFocus | null = null;
let lastFocusChange = 0;

const FOCUS_REACTION_GAP_MS = 5_000;

function reduced(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.getAttribute("data-reduce-motion") === "true")
    return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function onFocusChange(focus: CinematicFocus, subjectId?: string | number) {
  const now = Date.now();
  if (focus === lastFocus && now - lastFocusChange < FOCUS_REACTION_GAP_MS) {
    return;
  }
  lastFocus = focus;
  lastFocusChange = now;

  const store = useMascotStore.getState();
  if (!store.enabled) return;

  // Memory Room — quieter: lower energy, no gesture spam
  if (focus === "memory") {
    store.bumpEmotion("attention", 0.02);
    store.bumpEmotion("energy", -0.04);
    store.bumpEmotion("sleepiness", 0.03);
    store.dispatch({ type: "context", context: "idle" });
    if (!reduced() && Math.random() < 0.35) {
      store.requestAnim({ anim: "think", holdMs: 1800 });
    }
    useMascotStore.setState({
      nextThinkAt: Date.now() + 12_000,
      lastDirectorReason: "cinema:memory-quiet",
      lastThought: null,
    });
    return;
  }

  if (focus === "oracle" || focus === "radar") {
    store.bumpEmotion("attention", 0.08);
    store.bumpEmotion("curiosity", 0.06);
    store.dispatch({ type: "context", context: "browsing" });
    if (!reduced()) {
      store.requestAnim({ anim: "point", holdMs: 1000 });
    }
    useMascotStore.setState({
      lastDirectorReason: `cinema:${focus}`,
      nextThinkAt: Date.now() + 8_000,
    });
    return;
  }

  if (focus === "watchlist") {
    store.bumpEmotion("attention", 0.05);
    store.bumpEmotion("curiosity", 0.04);
    useMascotStore.setState({
      lastDirectorReason: "cinema:watchlist",
      nextThinkAt: Date.now() + 9_000,
    });
    return;
  }

  if (focus === "anime" && subjectId != null) {
    store.bumpEmotion("curiosity", 0.05);
    store.bumpEmotion("attention", 0.06);
    useMascotStore.setState({
      lastDirectorReason: `cinema:anime:${subjectId}`,
      nextThinkAt: Math.max(store.nextThinkAt, Date.now() + 4_000),
    });
    return;
  }

  if (focus === "celebration") {
    store.bumpEmotion("happiness", 0.04);
    return;
  }

  if (focus === "ambient" || focus === "navigation") {
    useMascotStore.setState({
      lastDirectorReason: `cinema:${focus}`,
    });
  }
}

export function installCinematographyBridge(): void {
  if (typeof window === "undefined") return;
  if (unsubCinema) return;

  unsubCinema = useCinematographyStore.subscribe((state) => {
    onFocusChange(state.focus, state.subjectId);
  });

  unsubNexus = subscribeNexus((ev) => {
    if (ev.type === "page_viewed" && ev.path?.includes("/journey")) {
      onFocusChange("memory");
    }
    if (ev.type === "page_viewed" && ev.path?.includes("/watchlist")) {
      onFocusChange("watchlist");
    }
  });

  const initial = useCinematographyStore.getState();
  onFocusChange(initial.focus, initial.subjectId);
}

export function uninstallCinematographyBridge(): void {
  unsubCinema?.();
  unsubCinema = null;
  unsubNexus?.();
  unsubNexus = null;
}
