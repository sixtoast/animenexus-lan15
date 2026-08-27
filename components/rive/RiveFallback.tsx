"use client";

import type { CSSProperties, ReactNode } from "react";

export type RiveFallbackProps = {
  /** Optional label for a11y */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Static graphic / emoji / SVG — no animation required */
  children?: ReactNode;
  /** loading | reduced | error | blocked */
  reason?: "loading" | "reduced" | "error" | "blocked" | "empty";
};

/**
 * Non-animated stand-in when Rive is loading, disabled, or fails.
 * Presentation only — never owns focus or click handlers of the real control.
 */
export function RiveFallback({
  label,
  className = "",
  style,
  children,
  reason = "empty",
}: RiveFallbackProps) {
  return (
    <div
      className={`nx-rive-fallback nx-rive-fallback--${reason} ${className}`.trim()}
      style={style}
      role="img"
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-rive-fallback={reason}
    >
      {children ?? (
        <span className="nx-rive-fallback-mark" aria-hidden>
          {reason === "loading" ? "…" : reason === "error" ? "!" : "·"}
        </span>
      )}
    </div>
  );
}
