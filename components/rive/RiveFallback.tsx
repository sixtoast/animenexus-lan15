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
  /** Semantic static frame when reduced (idle / success / error) */
  staticState?: "idle" | "success" | "error" | "pressed";
};

const STATIC_GLYPH: Record<
  NonNullable<RiveFallbackProps["staticState"]>,
  string
> = {
  idle: "○",
  success: "✓",
  error: "!",
  pressed: "●",
};

/**
 * Non-animated stand-in when Rive is loading, reduced-motion, or fails.
 * Presentation only — never owns focus or click handlers of the real control.
 * Sprint 39: reduced path is a static state frame, not an empty hole.
 */
export function RiveFallback({
  label,
  className = "",
  style,
  children,
  reason = "empty",
  staticState = "idle",
}: RiveFallbackProps) {
  const glyph =
    reason === "loading"
      ? "…"
      : reason === "error"
        ? "!"
        : reason === "reduced"
          ? STATIC_GLYPH[staticState]
          : reason === "blocked"
            ? STATIC_GLYPH.idle
            : "·";

  return (
    <div
      className={`nx-rive-fallback nx-rive-fallback--${reason} ${className}`.trim()}
      style={style}
      role="img"
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      data-rive-fallback={reason}
      data-static-state={reason === "reduced" ? staticState : undefined}
    >
      {children ?? (
        <span className="nx-rive-fallback-mark" aria-hidden>
          {glyph}
        </span>
      )}
    </div>
  );
}
