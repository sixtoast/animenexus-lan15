/**
 * Sprint 7 — Animation channel priority (documentation + helpers).
 *
 * Channels (high → low):
 *  1. force social / gesture (wave, point, surprised, jump)
 *  2. locomotion (walk, run, jump, land)
 *  3. ambient idle / sleep from emotions
 *
 * RULE: requestAnim may set social without clearing locomotion
 *       when walking (see store.requestAnim socialGestures keep).
 */

import type { MascotAnim } from "./types";

export type AnimChannel = "locomotion" | "social" | "expression" | "legacy";

const SOCIAL: MascotAnim[] = [
  "wave",
  "point",
  "happy",
  "think",
  "surprised",
];

const LOCOMOTION: MascotAnim[] = ["walk", "jump", "land", "idle", "sleep"];

export function isSocialAnim(a: MascotAnim): boolean {
  return SOCIAL.includes(a);
}

export function isLocomotionAnim(a: MascotAnim): boolean {
  return LOCOMOTION.includes(a);
}

/** Priority score for interrupt decisions (higher wins). */
export function animPriority(a: MascotAnim, force = false): number {
  if (force) return 100;
  switch (a) {
    case "surprised":
      return 90;
    case "jump":
      return 80;
    case "land":
      return 75;
    case "wave":
    case "point":
    case "happy":
      return 60;
    case "think":
      return 40;
    case "walk":
      return 30;
    case "sleep":
      return 20;
    case "idle":
    default:
      return 10;
  }
}

export function canAnimInterrupt(
  current: MascotAnim,
  next: MascotAnim,
  force = false,
): boolean {
  if (force) return true;
  if (current === next) return true;
  return animPriority(next) >= animPriority(current);
}
