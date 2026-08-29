"use client";

import { useMemo } from "react";
import { NexusRive } from "./NexusRive";
import {
  applyRiveBand,
  type RiveBridgeTarget,
  type RiveInputState,
} from "./RiveStateBridge";

/** Real RadarClient phase values */
export type RadarPhase =
  | "idle"
  | "scanning"
  | "signal"
  | "identify"
  | "result"
  | "error";

/**
 * Map product phases → shared Rive vocabulary (+ optional calibrating via attention).
 * Never invent success: `result` only after data is set in RadarClient.
 */
export function radarPhaseToRive(phase: RadarPhase): RiveInputState {
  switch (phase) {
    case "idle":
      return "idle";
    case "scanning":
      return "loading";
    case "signal":
      return "attention";
    case "identify":
      return "loading";
    case "result":
      return "complete";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

export type RadarInstrumentProps = {
  phase: RadarPhase;
  /** Number of contacts after a successful scan */
  contactCount?: number;
  className?: string;
  /** Optional .riv — default public path */
  src?: string;
};

/**
 * Presentation-only radar instrument.
 * Accessible results stay in RadarClient list UI — this never replaces them.
 */
export function RadarInstrument({
  phase,
  contactCount = 0,
  className = "",
  src = "/rive/radar-instrument.riv",
}: RadarInstrumentProps) {
  const appState = useMemo(() => radarPhaseToRive(phase), [phase]);

  const onReady = (bridge: RiveBridgeTarget) => {
    // band 0–5 from contact density (soft signal, not a ranking)
    const band =
      contactCount <= 0
        ? 0
        : Math.min(5, 1 + Math.floor(Math.log2(contactCount + 1)));
    applyRiveBand(bridge, band);
  };

  return (
    <div
      className={`radar-instrument ${className}`.trim()}
      data-radar-phase={phase}
      data-radar-contacts={contactCount}
      aria-hidden
    >
      <NexusRive
        src={src}
        stateMachines="State Machine 1"
        appState={appState}
        height={120}
        width="100%"
        priority
        onRiveReady={onReady}
        label={`Radar instrument · ${phase}`}
        fallback={
          <div className="radar-instrument-fallback" data-phase={phase}>
            <div className="radar-instrument-ring" />
            <div className="radar-instrument-sweep" />
            <span className="radar-instrument-label">{phaseLabel(phase)}</span>
          </div>
        }
      />
    </div>
  );
}

function phaseLabel(phase: RadarPhase): string {
  switch (phase) {
    case "idle":
      return "Standby";
    case "scanning":
      return "Calibrating";
    case "signal":
      return "Scanning";
    case "identify":
      return "Signal";
    case "result":
      return "Complete";
    case "error":
      return "Error";
    default:
      return "";
  }
}
