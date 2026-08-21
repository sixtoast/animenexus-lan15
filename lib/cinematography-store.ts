/**
 * Lightweight cinematography store (Zustand — already in deps).
 * Subscribers: CinematographyController, future Lantern staging.
 */

import { create } from "zustand";
import {
  applyCinematographyToDocument,
  DEFAULT_CINEMATIC,
  routeFocus,
  withReducedMotion,
  type CinematicFocus,
  type CinematicState,
} from "./cinematography";

type CinemaStore = CinematicState & {
  setState: (partial: Partial<CinematicState>) => void;
  setFocus: (
    focus: CinematicFocus,
    opts?: { subjectId?: string | number; temporaryMs?: number },
  ) => void;
  applyRoute: (path: string) => void;
  pulse: (partial: Partial<CinematicState>, ms?: number) => void;
  resetAmbient: () => void;
};

let pulseTimer: ReturnType<typeof setTimeout> | null = null;
let routeSnapshot: CinematicState = { ...DEFAULT_CINEMATIC };

function reducedNow(): boolean {
  if (typeof document === "undefined") return false;
  if (document.documentElement.getAttribute("data-reduce-motion") === "true")
    return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function publish(state: CinematicState): CinematicState {
  const next = reducedNow() ? withReducedMotion(state) : state;
  applyCinematographyToDocument(next);
  return next;
}

export const useCinematographyStore = create<CinemaStore>((set, get) => ({
  ...DEFAULT_CINEMATIC,

  setState: (partial) => {
    const merged = { ...get(), ...partial };
    const {
      setState: _s,
      setFocus: _f,
      applyRoute: _a,
      pulse: _p,
      resetAmbient: _r,
      ...clean
    } = merged;
    const published = publish(clean as CinematicState);
    set(published);
  },

  setFocus: (focus, opts) => {
    const base = { ...get() };
    const next: CinematicState = {
      focus,
      subjectId: opts?.subjectId,
      depth: base.depth,
      backgroundEmphasis:
        focus === "celebration"
          ? 0.3
          : focus === "anime"
            ? 0.22
            : base.backgroundEmphasis,
      foregroundEmphasis:
        focus === "celebration"
          ? 0.7
          : focus === "recommendation"
            ? 0.5
            : base.foregroundEmphasis,
      vignette: focus === "celebration" ? 0.14 : base.vignette,
      ambientContrast: base.ambientContrast,
      lanternAttention:
        focus === "celebration"
          ? 0.85
          : focus === "anime"
            ? 0.55
            : base.lanternAttention,
      motionWeight: base.motionWeight,
    };
    const published = publish(next);
    set(published);
    if (opts?.temporaryMs && opts.temporaryMs > 0) {
      if (pulseTimer) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => {
        get().applyRoute(
          typeof window !== "undefined" ? window.location.pathname : "/",
        );
      }, opts.temporaryMs);
    }
  },

  applyRoute: (path) => {
    const partial = routeFocus(path);
    const next: CinematicState = {
      ...DEFAULT_CINEMATIC,
      ...partial,
      motionWeight: reducedNow() ? 0 : 1,
    };
    routeSnapshot = next;
    const published = publish(next);
    set(published);
  },

  pulse: (partial, ms = 1600) => {
    const before = { ...routeSnapshot };
    const merged: CinematicState = {
      ...get(),
      ...partial,
    };
    const published = publish(merged);
    set(published);
    if (pulseTimer) clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => {
      const restored = publish(before);
      set(restored);
    }, ms);
  },

  resetAmbient: () => {
    const published = publish({ ...DEFAULT_CINEMATIC });
    routeSnapshot = published;
    set(published);
  },
}));

/** Non-React access for event bridges. */
export function getCinematography() {
  return useCinematographyStore.getState();
}
