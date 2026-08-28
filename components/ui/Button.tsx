"use client";

import {
  forwardRef,
  useCallback,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { playCue } from "@/lib/sound-engine";
import { getRiveAsset, type RiveAssetKey } from "@/lib/rive-assets";
import { NexusRive } from "@/components/rive/NexusRive";
import { resolveRiveState } from "@/components/rive/RiveStateBridge";

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
  /** Optional high-value Rive mark (Sprint 4) — missing .riv → CSS only */
  riveKey?: RiveAssetKey;
  /** Real error from parent — drives Rive error state */
  error?: boolean;
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
      error = false,
      riveKey,
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
    const asset = riveKey ? getRiveAsset(riveKey) : null;
    const riveState = resolveRiveState(
      {
        loading,
        success,
        error,
        disabled: Boolean(disabled),
      },
      {},
    );

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) return;
        if (!silent && !isDanger) {
          playCue("ui_tap");
        }
        onClick?.(e);
      },
      [disabled, loading, silent, isDanger, onClick],
    );

    const riveLeading =
      asset && !leading ? (
        <NexusRive
          src={asset.src}
          stateMachines={asset.stateMachines}
          appState={riveState}
          height={size === "sm" ? 18 : 22}
          width={size === "sm" ? 18 : 22}
          priority
          label={asset.label}
          fallback={<span className="btn-rive-dot" aria-hidden />}
        />
      ) : null;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-success={success || undefined}
        data-error={error || undefined}
        data-rive-key={riveKey || undefined}
        className={cx(
          "btn",
          "ix-press",
          `btn-${variant === "primary" ? "primary" : variant}`,
          size !== "md" && `btn-${size}`,
          isIcon && "btn-icon",
          fullWidth && "btn-block",
          loading && "btn-loading",
          success && "btn-success",
          error && "btn-error",
          variant === "accent" && "ix-highlight",
          riveKey && "btn-rive",
          className,
        )}
        onClick={handleClick}
        {...rest}
      >
        {loading && !riveLeading ? (
          <span className="btn-spinner" aria-hidden />
        ) : riveLeading ? (
          <span className="btn-leading btn-leading-rive">{riveLeading}</span>
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
