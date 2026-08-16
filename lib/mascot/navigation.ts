/**
 * Navigation targets in canonical PAGE WORLD (x/y).
 * Legacy habitat x/z is bridged via world-coords helpers.
 */

import {
  clampWorld,
  HABITAT_BOUNDS,
  WORLD_BOUNDS,
  type WorldPoint,
} from "./world-coords";

/** Canonical store / Director target — page world x/y. */
export type NavTarget = WorldPoint;

/** @deprecated use WORLD_BOUNDS */
export { HABITAT_BOUNDS, WORLD_BOUNDS };

/** Clamp a page-world point (authoritative). */
export function clampToWorld(x: number, y: number): NavTarget {
  return clampWorld(x, y);
}

/**
 * Legacy name kept so older call sites compile.
 * Parameters are (x, y) in page world — the second arg used to be habitat z.
 */
export function clampToHabitat(x: number, yOrZ: number): NavTarget {
  return clampWorld(x, yOrZ);
}

export function randomWanderTarget(): NavTarget {
  const x =
    WORLD_BOUNDS.minX +
    Math.random() * (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX);
  const y =
    WORLD_BOUNDS.minY +
    Math.random() * (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY);
  return clampWorld(x, y);
}

/** Distance on the page plane (x/y). */
export function distWorld(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.hypot(bx - ax, by - ay);
}

/** @deprecated use distWorld */
export function distXZ(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  return distWorld(ax, az, bx, bz);
}
