/**
 * Rive interaction state convention (Creative Tech Sprints 2–3).
 *
 * Application state drives Rive — never the reverse for success/error.
 * Shared vocabulary across .riv assets:
 *
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

export type RiveBridgeTarget = {
  /** Fire a named trigger on the active state machine */
  fire?: (name: string) => void;
  /** Set a boolean input */
  setBool?: (name: string, value: boolean) => void;
  /** Set a number input */
  setNumber?: (name: string, value: number) => void;
};

/**
 * Map a high-level app state into Rive inputs.
 * Prefer boolean flags named after RIVE_INPUT_STATES when the artboard uses them.
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

/**
 * Derive presentation state from real async work — never invent success.
 */
export function stateFromAsync(status: {
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
}): RiveInputState {
  if (status.disabled) return "disabled";
  if (status.loading) return "loading";
  if (status.error) return "error";
  if (status.success) return "success";
  return "idle";
}
