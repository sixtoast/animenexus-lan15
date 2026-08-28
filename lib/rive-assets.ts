/**
 * High-value Rive button / instrument asset registry (Sprint 4).
 * Paths are under public/. Missing files → UI falls back to CSS (no error).
 */

export type RiveAssetKey =
  | "oracle_ask"
  | "radar_scan"
  | "sauce_trace"
  | "tonight_start"
  | "challenge_submit"
  | "shelf_mode";

export type RiveAssetDef = {
  key: RiveAssetKey;
  /** public URL path */
  src: string;
  stateMachines: string;
  label: string;
};

export const RIVE_ASSETS: Record<RiveAssetKey, RiveAssetDef> = {
  oracle_ask: {
    key: "oracle_ask",
    src: "/rive/oracle-ask.riv",
    stateMachines: "State Machine 1",
    label: "Oracle broadcast",
  },
  radar_scan: {
    key: "radar_scan",
    src: "/rive/radar-scan.riv",
    stateMachines: "State Machine 1",
    label: "Radar scan",
  },
  sauce_trace: {
    key: "sauce_trace",
    src: "/rive/sauce-trace.riv",
    stateMachines: "State Machine 1",
    label: "Sauce trace",
  },
  tonight_start: {
    key: "tonight_start",
    src: "/rive/tonight-start.riv",
    stateMachines: "State Machine 1",
    label: "Tonight plan",
  },
  challenge_submit: {
    key: "challenge_submit",
    src: "/rive/challenge-submit.riv",
    stateMachines: "State Machine 1",
    label: "Challenge submit",
  },
  shelf_mode: {
    key: "shelf_mode",
    src: "/rive/shelf-mode.riv",
    stateMachines: "State Machine 1",
    label: "Shelf mode",
  },
};

export function getRiveAsset(key: RiveAssetKey): RiveAssetDef {
  return RIVE_ASSETS[key];
}
