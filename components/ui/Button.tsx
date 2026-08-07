"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

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
      className,
      disabled,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const isIcon = variant === "icon";
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cx(
          "btn",
          `btn-${variant === "primary" ? "primary" : variant}`,
          size !== "md" && `btn-${size}`,
          isIcon && "btn-icon",
          fullWidth && "btn-block",
          loading && "btn-loading",
          className,
        )}
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
