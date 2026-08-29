/**
 * Shared motion categories (Creative Sprint 35).
 * Keep CSS / Rive / Lottie / R3F pacing aligned.
 */

export type MotionCategory =
  | "immediate"
  | "responsive"
  | "deliberate"
  | "cinematic";

/** Nominal duration in ms (authoring reference — CSS owns actual timing). */
export const MOTION_MS: Record<MotionCategory, number> = {
  immediate: 100,
  responsive: 200,
  deliberate: 420,
  cinematic: 780,
};

/**
 * Suggested Lottie/Rive playback rate so authored clips match site bands.
 * 1 = timeline as designed for responsive UI.
 */
export function motionPlaybackRate(category: MotionCategory): number {
  switch (category) {
    case "immediate":
      return 1.15;
    case "responsive":
      return 1;
    case "deliberate":
      return 0.92;
    case "cinematic":
      return 0.85;
    default:
      return 1;
  }
}

/** Map common UI verbs → category */
export function categoryForAction(
  action:
    | "press"
    | "hover"
    | "toggle"
    | "navigate"
    | "seal"
    | "modal"
    | "room"
    | "shelf-camera"
    | "view-transition",
): MotionCategory {
  switch (action) {
    case "press":
    case "toggle":
      return "immediate";
    case "hover":
    case "navigate":
    case "modal":
      return "responsive";
    case "seal":
      return "deliberate";
    case "room":
    case "shelf-camera":
    case "view-transition":
      return "cinematic";
    default:
      return "responsive";
  }
}
