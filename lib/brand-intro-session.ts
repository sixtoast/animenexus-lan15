/**
 * Pure session-gate helpers for The First Light brand intro.
 * Shared by FirstVisitHost and unit tests — no React dependency.
 */

export const BRAND_SESSION_KEY = "animenexus.brand_intro.shown.v1";
export const LEGACY_INTRO_KEY = "animenexus.intro.dismissed.v1";

/** Timeline (ms) — production + tests share these values. */
export const BRAND_INTRO_TIMING = {
  spark: 150,
  signal: 340,
  presence: 610,
  mark: 760,
  wordmark: 950,
  exit: 1360,
  reducedExit: 520,
  exitFade: 180,
  reducedExitFade: 80,
} as const;

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Whether the brand ident should run in this browser session.
 * Uses sessionStorage only — legacy localStorage key does not gate.
 */
export function shouldShowBrandIntro(
  storage?: StorageLike | null,
): boolean {
  try {
    const s =
      storage ??
      (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    if (!s) return true;
    return s.getItem(BRAND_SESSION_KEY) !== "1";
  } catch {
    // Storage throws (private mode) → fail open so visual still works once
    return true;
  }
}

/**
 * Mark intro as shown for this session.
 * Also retires the legacy permanent-dismiss key for compatibility.
 */
export function markBrandIntroShown(
  session?: StorageLike | null,
  local?: StorageLike | null,
): void {
  try {
    const ss =
      session ??
      (typeof sessionStorage !== "undefined" ? sessionStorage : null);
    ss?.setItem(BRAND_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
  try {
    const ls =
      local ??
      (typeof localStorage !== "undefined" ? localStorage : null);
    ls?.setItem(LEGACY_INTRO_KEY, "1");
  } catch {
    /* private mode */
  }
}
