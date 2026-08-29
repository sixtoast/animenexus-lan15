/**
 * Creative Sprint 11 — contextual onboarding “seen” persistence.
 * localStorage only; soft-fail in private mode.
 */

export type OnboardingFeature =
  | "seal"
  | "resonance"
  | "living_shelf"
  | "oracle"
  | "journey"
  | "radar";

const KEY = "animenexus.onboarding.seen.v1";

type SeenMap = Partial<Record<OnboardingFeature, boolean>>;

function readMap(): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SeenMap;
  } catch {
    return {};
  }
}

function writeMap(m: SeenMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* private mode */
  }
}

export function hasSeenOnboarding(feature: OnboardingFeature): boolean {
  return !!readMap()[feature];
}

export function markOnboardingSeen(feature: OnboardingFeature): void {
  const m = readMap();
  m[feature] = true;
  writeMap(m);
}

/** Allow Help / About replay */
export function clearOnboardingSeen(feature?: OnboardingFeature): void {
  if (!feature) {
    writeMap({});
    return;
  }
  const m = readMap();
  delete m[feature];
  writeMap(m);
}

export function listOnboardingSeen(): OnboardingFeature[] {
  const m = readMap();
  return (Object.keys(m) as OnboardingFeature[]).filter((k) => m[k]);
}
