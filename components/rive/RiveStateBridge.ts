/**
 * Rive interaction state convention (Creative Tech Sprint 3).
 *
 * Rules:
 * 1. Application state drives Rive — never the reverse for success/error.
 * 2. Never show success before the underlying operation confirms.
 * 3. Shared vocabulary across .riv assets (extend intentionally only).
 * 4. HTML control remains the accessible source of truth; Rive is presentation.
 *
 * Core states:
 *   idle | hover | pressed | loading | success | error | disabled | attention | complete
 */

export const RIVE_INPUT_STATES = [
  "idle",
  "hover",
  "pressed",
  "loading",
  "success",
  "error",
  "disabled",
  "attention",
  "complete",
] as const;

export type RiveInputState = (typeof RIVE_INPUT_STATES)[number];

/** Optional number band inputs for instruments (Radar/Oracle). */
export type RiveInstrumentBand =
  | "band_0"
  | "band_1"
  | "band_2"
  | "band_3"
  | "band_4"
  | "band_5";

export type RiveBridgeTarget = {
  fire?: (name: string) => void;
  setBool?: (name: string, value: boolean) => void;
  setNumber?: (name: string, value: number) => void;
};

export type AsyncVisualStatus = {
  loading?: boolean;
  error?: boolean;
  /** Only set after real success */
  success?: boolean;
  disabled?: boolean;
  /** Soft pull of attention without claiming success */
  attention?: boolean;
  /** Durable completion (e.g. challenge finished) */
  complete?: boolean;
};

export type PointerVisualStatus = {
  hover?: boolean;
  pressed?: boolean;
};

/**
 * Priority: disabled > loading > error > complete > success > attention > pressed > hover > idle
 * Matches product truth, not animation convenience.
 */
export function resolveRiveState(
  async: AsyncVisualStatus = {},
  pointer: PointerVisualStatus = {},
): RiveInputState {
  if (async.disabled) return "disabled";
  if (async.loading) return "loading";
  if (async.error) return "error";
  if (async.complete) return "complete";
  if (async.success) return "success";
  if (async.attention) return "attention";
  if (pointer.pressed) return "pressed";
  if (pointer.hover) return "hover";
  return "idle";
}

/** @deprecated Prefer resolveRiveState */
export function stateFromAsync(status: AsyncVisualStatus): RiveInputState {
  return resolveRiveState(status, {});
}

/**
 * Map a high-level app state into Rive inputs.
 * Prefer exclusive boolean flags named after RIVE_INPUT_STATES.
 */
export function applyRiveState(
  target: RiveBridgeTarget | null | undefined,
  state: RiveInputState,
  opts?: { exclusiveBooleans?: boolean },
): void {
  if (!target) return;
  const exclusive = opts?.exclusiveBooleans !== false;
  if (exclusive && target.setBool) {
    for (const s of RIVE_INPUT_STATES) {
      target.setBool(s, s === state);
    }
    return;
  }
  if (target.fire) {
    target.fire(state);
    return;
  }
  if (target.setBool) {
    target.setBool(state, true);
  }
}

/** Instrument band (0–5) as number input `band` when the .riv defines it. */
export function applyRiveBand(
  target: RiveBridgeTarget | null | undefined,
  bandIndex: number,
): void {
  if (!target?.setNumber) return;
  const n = Math.max(0, Math.min(5, Math.round(bandIndex)));
  target.setNumber("band", n);
}
