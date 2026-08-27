"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { NexusRive } from "./NexusRive";
import { useRiveAppState } from "./useRiveAppState";
import type { RiveInputState } from "./RiveStateBridge";

export type RiveButtonShellProps = {
  /** Optional .riv — if omitted, shell is CSS-only */
  src?: string;
  stateMachines?: string | string[];
  children: ReactNode;
  className?: string;
  riveClassName?: string;
  /** Controlled async flags from parent (preferred for real API) */
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
  /** Decorative size for the vector layer */
  riveHeight?: number | string;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "disabled"
>;

/**
 * Accessible <button> with optional Rive presentation layer.
 * Pointer + focus update Rive; loading/success/error come from props or runTracked.
 */
export function RiveButtonShell({
  src,
  stateMachines = "State Machine 1",
  children,
  className = "",
  riveClassName = "",
  loading,
  error,
  success,
  disabled,
  riveHeight = 28,
  onClick,
  ...rest
}: RiveButtonShellProps) {
  const {
    state,
    setAsync,
    bindBridge,
    pointerHandlers,
  } = useRiveAppState({
    loading: Boolean(loading),
    error: Boolean(error),
    success: Boolean(success),
    disabled: Boolean(disabled),
  });

  // Sync controlled props
  const resolved: RiveInputState = (() => {
    if (disabled) return "disabled";
    if (loading) return "loading";
    if (error) return "error";
    if (success) return "success";
    return state;
  })();

  return (
    <button
      type="button"
      className={`nx-rive-btn ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...pointerHandlers}
      {...rest}
    >
      {src ? (
        <span className={`nx-rive-btn-visual ${riveClassName}`.trim()} aria-hidden>
          <NexusRive
            src={src}
            stateMachines={stateMachines}
            appState={resolved}
            height={riveHeight}
            onRiveReady={bindBridge}
            priority
            fallback={<span className="nx-rive-btn-fallback" />}
          />
        </span>
      ) : null}
      <span className="nx-rive-btn-label">{children}</span>
    </button>
  );
}

/** Re-export helper for tracked clicks without the shell. */
export { useRiveAppState };
