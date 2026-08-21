/**
 * Cinematography Director (Awwwards Sprint 1).
 *
 * Environment answers: what does the room feel like?
 * Cinematography answers: what should the user be looking at?
 *
 * Never owns product state — only reacts (Nexus events + route).
 */

export type CinematicFocus =
  | "ambient"
  | "navigation"
  | "anime"
  | "recommendation"
  | "oracle"
  | "radar"
  | "watchlist"
  | "memory"
  | "modal"
  | "celebration";

export type CinematicDepth = "flat" | "layered" | "immersive";

export type CinematicState = {
  focus: CinematicFocus;
  subjectId?: string | number;
  depth: CinematicDepth;
  /** 0–1 how much background recedes */
  backgroundEmphasis: number;
  /** 0–1 how much foreground lifts */
  foregroundEmphasis: number;
  /** 0–1 vignette strength (CSS only; keep subtle) */
  vignette: number;
  /** 0–1 local contrast nudge */
  ambientContrast: number;
  /** 0–1 hint for Lantern attention later */
  lanternAttention: number;
  /** 0–1 motion weight (0 under reduced motion) */
  motionWeight: number;
};

export const DEFAULT_CINEMATIC: CinematicState = {
  focus: "ambient",
  depth: "layered",
  backgroundEmphasis: 0,
  foregroundEmphasis: 0.15,
  vignette: 0,
  ambientContrast: 0.1,
  lanternAttention: 0.2,
  motionWeight: 1,
};

export function routeFocus(path: string): Partial<CinematicState> {
  if (path.startsWith("/anime/")) {
    const id = path.match(/^\/anime\/(\d+)/)?.[1];
    return {
      focus: "anime",
      subjectId: id ? parseInt(id, 10) : undefined,
      depth: "layered",
      backgroundEmphasis: 0.25,
      foregroundEmphasis: 0.55,
      vignette: 0.12,
      ambientContrast: 0.2,
      lanternAttention: 0.55,
    };
  }
  if (path.startsWith("/watchlist")) {
    return {
      focus: "watchlist",
      depth: "layered",
      backgroundEmphasis: 0.1,
      foregroundEmphasis: 0.35,
      vignette: 0.06,
      lanternAttention: 0.4,
    };
  }
  if (path.startsWith("/journey")) {
    return {
      focus: "memory",
      depth: "immersive",
      backgroundEmphasis: 0.2,
      foregroundEmphasis: 0.4,
      vignette: 0.15,
      ambientContrast: 0.18,
      lanternAttention: 0.35,
    };
  }
  if (path.startsWith("/tools/oracle")) {
    return {
      focus: "oracle",
      depth: "layered",
      backgroundEmphasis: 0.2,
      foregroundEmphasis: 0.5,
      vignette: 0.1,
      lanternAttention: 0.6,
    };
  }
  if (path.startsWith("/tools/radar")) {
    return {
      focus: "radar",
      depth: "layered",
      backgroundEmphasis: 0.18,
      foregroundEmphasis: 0.48,
      vignette: 0.08,
      lanternAttention: 0.55,
    };
  }
  if (path.startsWith("/browse") || path.startsWith("/mood")) {
    return {
      focus: "ambient",
      depth: "layered",
      backgroundEmphasis: 0.05,
      foregroundEmphasis: 0.2,
      vignette: 0.04,
      lanternAttention: 0.25,
    };
  }
  return {
    focus: "ambient",
    depth: "layered",
    backgroundEmphasis: 0,
    foregroundEmphasis: 0.15,
    vignette: 0,
    lanternAttention: 0.2,
  };
}

export function applyCinematographyToDocument(state: CinematicState): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.cinemaFocus = state.focus;
  root.dataset.cinemaDepth = state.depth;
  root.dataset.cinemaMotion =
    state.motionWeight < 0.35 ? "still" : state.motionWeight < 0.75 ? "soft" : "full";
  root.style.setProperty("--cinema-bg", String(state.backgroundEmphasis));
  root.style.setProperty("--cinema-fg", String(state.foregroundEmphasis));
  root.style.setProperty("--cinema-vignette", String(state.vignette));
  root.style.setProperty("--cinema-contrast", String(state.ambientContrast));
  root.style.setProperty("--cinema-lantern", String(state.lanternAttention));
  root.style.setProperty("--cinema-motion", String(state.motionWeight));
  if (state.subjectId != null) {
    root.dataset.cinemaSubject = String(state.subjectId);
  } else {
    delete root.dataset.cinemaSubject;
  }
}

export function withReducedMotion(state: CinematicState): CinematicState {
  return {
    ...state,
    motionWeight: 0,
    depth: state.depth === "immersive" ? "layered" : state.depth,
    vignette: Math.min(state.vignette, 0.08),
    backgroundEmphasis: Math.min(state.backgroundEmphasis, 0.12),
  };
}
