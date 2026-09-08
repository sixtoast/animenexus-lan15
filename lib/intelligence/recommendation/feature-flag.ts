/**
 * Recommendation Intelligence V3 enablement.
 *
 * Priority:
 * 1. forceVersion in rank/candidates opts (lab only)
 * 2. NEXT_PUBLIC_REC_V3=1|0 (deploy-wide)
 * 3. localStorage an_rec_v3: "1" | "0" | absent
 * 4. auto: on when shelf has enough completion evidence
 *
 * Offline gate PASSED synthetic multi-signal vs tag. Production uses
 * evidence-gated auto rather than blanket default.
 */

import type { WatchlistEntry } from "@/lib/types";

export const REC_V3_STORAGE_KEY = "an_rec_v3";
export const REC_V3_MODE_EVENT = "animenexus:rec-v3";

export type RecV3Mode = "on" | "off" | "auto";

export const REC_V3_AUTO_MIN_COMPLETED = 3;
export const REC_V3_AUTO_MIN_SHELF = 6;

export function getRecV3Mode(): RecV3Mode {
  if (process.env.NEXT_PUBLIC_REC_V3 === "1") return "on";
  if (process.env.NEXT_PUBLIC_REC_V3 === "0") return "off";
  if (typeof window === "undefined") return "auto";
  try {
    const v = window.localStorage.getItem(REC_V3_STORAGE_KEY);
    if (v === "1") return "on";
    if (v === "0") return "off";
    return "auto";
  } catch {
    return "auto";
  }
}

export function shelfQualifiesForAutoV3(entries?: WatchlistEntry[]): boolean {
  if (!entries?.length) return false;
  const completed = entries.filter((e) => e.watchStatus === "completed").length;
  if (completed >= REC_V3_AUTO_MIN_COMPLETED) return true;
  if (entries.length >= REC_V3_AUTO_MIN_SHELF) return true;
  return false;
}

export function isRecV3Enabled(opts?: { entries?: WatchlistEntry[] }): boolean {
  const mode = getRecV3Mode();
  if (mode === "on") return true;
  if (mode === "off") return false;
  return shelfQualifiesForAutoV3(opts?.entries);
}

export function setRecV3Mode(mode: RecV3Mode): void {
  if (typeof window === "undefined") return;
  try {
    if (mode === "auto") {
      window.localStorage.removeItem(REC_V3_STORAGE_KEY);
    } else if (mode === "on") {
      window.localStorage.setItem(REC_V3_STORAGE_KEY, "1");
    } else {
      window.localStorage.setItem(REC_V3_STORAGE_KEY, "0");
    }
    window.dispatchEvent(new Event(REC_V3_MODE_EVENT));
  } catch {
    /* */
  }
}

/** @deprecated Prefer setRecV3Mode */
export function setRecV3Enabled(on: boolean): void {
  setRecV3Mode(on ? "on" : "off");
}

export function describeRecV3Mode(entries?: WatchlistEntry[]): string {
  const mode = getRecV3Mode();
  if (mode === "on") return "V3 forced on";
  if (mode === "off") return "V3 forced off (legacy V2)";
  if (shelfQualifiesForAutoV3(entries)) {
    return "V3 auto-on (shelf evidence)";
  }
  return "V2 auto (need more completed titles for V3)";
}
