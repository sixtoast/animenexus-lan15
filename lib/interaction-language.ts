/**
 * Interaction language (Micro-Interaction Programme · Sprint 0).
 *
 * Semantic states — components map to these, not ad-hoc durations.
 * CSS tokens live in app/micro-interactions.css + motion.css.
 *
 * Constraints:
 * - Routine movement ≤ ~8px; scale ≤ ~1.02–1.04 except deliberate reveals
 * - Always respect reduced-motion
 * - Prefer semantic class names over inventing transition: 0.3s ease
 */

export type InteractionState =
  | "press"
  | "release"
  | "hover-enter"
  | "hover-exit"
  | "select"
  | "deselect"
  | "success"
  | "error"
  | "reveal"
  | "settle"
  | "drag"
  | "drop"
  | "focus"
  | "navigation"
  | "progress"
  | "complete";

/** Timing bands (ms) — CSS mirrors these as --ix-fast / --ix-standard / --ix-deliberate */
export const IX_TIMING = {
  /** 70–120 ms — press, tick, immediate ack */
  fast: 90,
  /** 160–240 ms — hover settle, select, most UI */
  standard: 200,
  /** 350–550 ms — reveal, seal, deliberate moments */
  deliberate: 420,
} as const;

export type IxTimingBand = keyof typeof IX_TIMING;

/** Easing names mapped to CSS custom properties */
export const IX_EASE = {
  /** Spring-like overshoot for seal / celebrate only */
  spring: "var(--ix-ease-spring)",
  /** Expo-out for enter / navigation */
  expoOut: "var(--ix-ease-expo)",
  /** Soft settle for release / hover exit */
  soft: "var(--ix-ease-soft)",
} as const;

/** Motion amplitude caps (px / unitless scale) */
export const IX_AMPLITUDE = {
  maxTranslatePx: 8,
  maxRoutineScale: 1.03,
  maxRevealScale: 1.06,
  pressTranslatePx: 1,
  pressScale: 0.985,
} as const;

/** CSS class helpers for semantic states */
export const IX_CLASS: Record<InteractionState, string> = {
  press: "ix-press",
  release: "ix-release",
  "hover-enter": "ix-hover",
  "hover-exit": "ix-hover-exit",
  select: "ix-select",
  deselect: "ix-deselect",
  success: "ix-success",
  error: "ix-error",
  reveal: "ix-reveal",
  settle: "ix-settle",
  drag: "ix-drag",
  drop: "ix-drop",
  focus: "ix-focus",
  navigation: "ix-nav",
  progress: "ix-progress",
  complete: "ix-complete",
};

export function ixTransition(
  band: IxTimingBand = "standard",
  ease: keyof typeof IX_EASE = "soft",
): string {
  const ms = IX_TIMING[band];
  return `${ms}ms ${IX_EASE[ease]}`;
}

export function prefersIxReducedMotion(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.getAttribute("data-reduce-motion") === "true")
    return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
