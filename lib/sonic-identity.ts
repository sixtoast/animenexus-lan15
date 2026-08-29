/**
 * Sonic material identity (Creative Sprint 36).
 * Design language over engine gain buses.
 */

import type { SoundCueId } from "./sound-manifest";

export type SonicMaterial =
  | "touch"
  | "signal"
  | "object"
  | "success"
  | "warning"
  | "ceremony";

export const SONIC_MATERIAL: Record<SoundCueId, SonicMaterial> = {
  ui_tap: "touch",
  nav_tick: "touch",
  filter_select: "touch",
  menu_open: "ceremony",
  menu_close: "ceremony",
  modal_open: "ceremony",
  modal_close: "ceremony",
  seal: "object",
  remove: "object",
  progress_up: "object",
  progress_down: "object",
  shelf_settle: "object",
  resonance: "object",
  radar_ping: "signal",
  signal_acquired: "signal",
  oracle_tune: "signal",
  memory_focus: "signal",
  success: "success",
  challenge_ok: "success",
  error: "warning",
  challenge_bad: "warning",
  complete: "ceremony",
};

export function materialForCue(id: SoundCueId): SonicMaterial {
  return SONIC_MATERIAL[id];
}

/** Guard: ordinary UI should not fire success/ceremony materials */
export function isOrdinaryTouch(id: SoundCueId): boolean {
  return SONIC_MATERIAL[id] === "touch";
}
