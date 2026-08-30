/**
 * Success hierarchy (Creative Sprint 47).
 * Prevents celebration fatigue — scale response to outcome importance.
 */

export type SuccessTier =
  | "micro"
  | "action"
  | "major"
  | "milestone";

export type SuccessTreatment = {
  tier: SuccessTier;
  /** Toast tone */
  toastTone: "neutral" | "success";
  /** Optional cue — never success SFX for micro */
  cue: "none" | "ui_tap" | "seal" | "success" | "complete";
  /** SealMoment mode if any */
  sealMode: null | "seal" | "completed";
  /** Toast duration ms */
  durationMs: number;
  description: string;
};

export const SUCCESS_TREATMENTS: Record<SuccessTier, SuccessTreatment> = {
  micro: {
    tier: "micro",
    toastTone: "neutral",
    cue: "none",
    sealMode: null,
    durationMs: 1800,
    description: "Saved note / toggle — no ceremony",
  },
  action: {
    tier: "action",
    toastTone: "success",
    cue: "seal",
    sealMode: "seal",
    durationMs: 2600,
    description: "Watchlist add / status change — small seal",
  },
  major: {
    tier: "major",
    toastTone: "success",
    cue: "complete",
    sealMode: "completed",
    durationMs: 3200,
    description: "Completed anime — story closed",
  },
  milestone: {
    tier: "milestone",
    toastTone: "success",
    cue: "complete",
    sealMode: "completed",
    durationMs: 3800,
    description: "Taste/journey milestone — richer hold",
  },
};

export function treatmentForSuccess(tier: SuccessTier): SuccessTreatment {
  return SUCCESS_TREATMENTS[tier];
}
