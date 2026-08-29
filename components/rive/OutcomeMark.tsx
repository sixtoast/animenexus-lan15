"use client";

import { useMemo } from "react";
import { NexusRive } from "./NexusRive";
import type { RiveInputState } from "./RiveStateBridge";

export type OutcomeTone = "success" | "error";

export function outcomeToRive(tone: OutcomeTone): RiveInputState {
  return tone === "success" ? "complete" : "error";
}

export type OutcomeMarkProps = {
  tone: OutcomeTone;
  /** Only show after real async confirmation */
  active?: boolean;
  className?: string;
  size?: "sm" | "md";
  src?: string;
  label?: string;
};

/**
 * Micro success/error mark.
 * Never set tone=success until the underlying operation confirms.
 * Presentation only — parent owns the accessible message.
 */
export function OutcomeMark({
  tone,
  active = true,
  className = "",
  size = "md",
  src = "/rive/outcome-mark.riv",
  label,
}: OutcomeMarkProps) {
  const appState = useMemo(
    () => (active ? outcomeToRive(tone) : "idle"),
    [active, tone],
  );
  const dim = size === "sm" ? 20 : 32;

  if (!active) return null;

  return (
    <div
      className={`nx-outcome-mark nx-outcome-mark--${tone} ${className}`.trim()}
      data-outcome={tone}
      aria-hidden
    >
      <NexusRive
        src={src}
        stateMachines="State Machine 1"
        appState={appState}
        height={dim}
        width={dim}
        priority
        label={label || (tone === "success" ? "Success" : "Error")}
        fallback={
          <span className="nx-outcome-fallback" data-tone={tone}>
            {tone === "success" ? "✓" : "!"}
          </span>
        }
      />
    </div>
  );
}
