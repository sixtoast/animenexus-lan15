"use client";

import { useMemo } from "react";
import { SignalBars } from "@/components/ui/SignalBars";
import { NexusRive } from "./NexusRive";
import type { RiveInputState } from "./RiveStateBridge";

/** Theatre phase index 0–2 from LoadingTheater */
export type LoadingPhase = 0 | 1 | 2;

/**
 * Map discrete loading theatre phases → Rive vocabulary.
 * No fake progress % — only calm phase steps driven by real wall-clock theatre.
 */
export function loadingPhaseToRive(phase: number): RiveInputState {
  if (phase <= 0) return "loading";
  if (phase === 1) return "attention";
  return "loading";
}

export type LoadingSymbolProps = {
  /** 0 tuning · 1 listening · 2 resolving */
  phase?: number;
  /** SignalBars strength when CSS/Rive falls back */
  level?: number;
  className?: string;
  label?: string;
  src?: string;
  /** Compact mark for inline (skeletons) */
  size?: "sm" | "md";
};

/**
 * Presentation loading mark for LoadingTheater / skeletons.
 * Accessible status text stays in the parent (label + phase line).
 */
export function LoadingSymbol({
  phase = 0,
  level = 3,
  className = "",
  label = "Receiving signal",
  src = "/rive/loading-symbol.riv",
  size = "md",
}: LoadingSymbolProps) {
  const appState = useMemo(
    () => loadingPhaseToRive(phase),
    [phase],
  );
  const dim = size === "sm" ? 36 : 56;

  return (
    <div
      className={`nx-loading-symbol ${className}`.trim()}
      data-loading-phase={phase}
      aria-hidden
    >
      <NexusRive
        src={src}
        stateMachines="State Machine 1"
        appState={appState}
        height={dim}
        width={dim}
        priority
        label={label}
        fallback={
          <div className="nx-loading-symbol-fallback" data-phase={phase}>
            <SignalBars level={level} animated label={label} />
            <span className="nx-loading-symbol-ring" />
          </div>
        }
      />
    </div>
  );
}
