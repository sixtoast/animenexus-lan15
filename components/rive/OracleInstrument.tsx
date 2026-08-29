"use client";

import { useMemo } from "react";
import type { OracleMode } from "@/lib/oracle-cloud";
import { ORACLE_MODES } from "@/lib/oracle-cloud";
import { NexusRive } from "./NexusRive";
import {
  applyRiveBand,
  type RiveBridgeTarget,
  type RiveInputState,
} from "./RiveStateBridge";

/** Real Oracle AI presentation states (not token-level). */
export type OracleAiState =
  | "idle"
  | "thinking"
  | "complete"
  | "failed";

export function oracleAiToRive(ai: OracleAiState): RiveInputState {
  switch (ai) {
    case "idle":
      return "idle";
    case "thinking":
      return "loading";
    case "complete":
      return "complete";
    case "failed":
      return "error";
    default:
      return "idle";
  }
}

export function oracleModeBandIndex(mode: OracleMode): number {
  const i = ORACLE_MODES.findIndex((m) => m.id === mode);
  return i >= 0 ? i : 0;
}

export type OracleInstrumentProps = {
  mode: OracleMode;
  /** idle | thinking | complete | failed — from real OracleClient flags */
  aiState: OracleAiState;
  /** Display frequency string e.g. 98.1 · Tonight */
  frequency?: string;
  className?: string;
  src?: string;
};

/**
 * Presentation-only frequency instrument.
 * Mode tabs remain the accessible control; this never replaces them.
 * Does not animate per streamed token — only discrete aiState changes.
 */
export function OracleInstrument({
  mode,
  aiState,
  frequency,
  className = "",
  src = "/rive/oracle-instrument.riv",
}: OracleInstrumentProps) {
  const appState = useMemo(() => oracleAiToRive(aiState), [aiState]);
  const bandIndex = useMemo(() => oracleModeBandIndex(mode), [mode]);

  const onReady = (bridge: RiveBridgeTarget) => {
    applyRiveBand(bridge, bandIndex);
  };

  return (
    <div
      className={`nx-oracle-rive ${className}`.trim()}
      data-oracle-mode={mode}
      data-oracle-ai={aiState}
      data-oracle-band={bandIndex}
      aria-hidden
    >
      <NexusRive
        src={src}
        stateMachines="State Machine 1"
        appState={appState}
        height={100}
        width="100%"
        priority
        onRiveReady={onReady}
        label={`Oracle tuner · ${mode} · ${aiState}`}
        fallback={
          <div
            className="nx-oracle-rive-fallback"
            data-ai={aiState}
            data-band={bandIndex}
          >
            <div className="nx-oracle-rive-dial">
              <span
                className="nx-oracle-rive-needle"
                style={{ transform: `rotate(${-40 + bandIndex * 16}deg)` }}
              />
            </div>
            <span className="nx-oracle-rive-freq">
              {frequency || ORACLE_MODES[bandIndex]?.frequency || "—"}
            </span>
            <span className="nx-oracle-rive-status">{statusLabel(aiState)}</span>
          </div>
        }
      />
    </div>
  );
}

function statusLabel(ai: OracleAiState): string {
  switch (ai) {
    case "idle":
      return "Standby";
    case "thinking":
      return "Tuning";
    case "complete":
      return "Locked";
    case "failed":
      return "Lost";
    default:
      return "";
  }
}
