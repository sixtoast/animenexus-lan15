"use client";

import {
  forwardRef,
  useCallback,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { playCue } from "@/lib/sound-engine";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "outline"
  | "ghost"
  | "danger"
  | "icon";

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Optional leading icon / emoji */
  leading?: ReactNode;
  fullWidth?: boolean;
  /** Skip default ui_tap (seal / error / radar own their cues) */
  silent?: boolean;
  /** Brief success flash after async work */
  success?: boolean;
};

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      leading,
      fullWidth,
      silent = false,
      success = false,
      className,
      disabled,
      children,
      type = "button",
      onClick,
      ...rest
    },
    ref,
  ) {
    const isIcon = variant === "icon";
    const isDanger = variant === "danger";

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) return;
        // Sound only on confirmed activation — not on press-only
        if (!silent && !isDanger) {
          playCue("ui_tap");
        }
        onClick?.(e);
      },
      [disabled, loading, silent, isDanger, onClick],
    );

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-success={success || undefined}
        className={cx(
          "btn",
          "ix-press",
          `btn-${variant === "primary" ? "primary" : variant}`,
          size !== "md" && `btn-${size}`,
          isIcon && "btn-icon",
          fullWidth && "btn-block",
          loading && "btn-loading",
          success && "btn-success",
          variant === "accent" && "ix-highlight",
          className,
        )}
        onClick={handleClick}
        {...rest}
      >
        {loading ? (
          <span className="btn-spinner" aria-hidden />
        ) : leading ? (
          <span className="btn-leading">{leading}</span>
        ) : null}
        {children != null && children !== "" ? (
          <span className="btn-label">{children}</span>
        ) : null}
      </button>
    );
  },
);
