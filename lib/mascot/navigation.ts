import { HABITAT_BOUNDS } from "./types";

export type NavTarget = { x: number; z: number };

export function clampToHabitat(x: number, z: number): NavTarget {
  return {
    x: Math.max(HABITAT_BOUNDS.minX, Math.min(HABITAT_BOUNDS.maxX, x)),
    z: Math.max(HABITAT_BOUNDS.minZ, Math.min(HABITAT_BOUNDS.maxZ, z)),
  };
}

export function randomWanderTarget(): NavTarget {
  const x =
    HABITAT_BOUNDS.minX +
    Math.random() * (HABITAT_BOUNDS.maxX - HABITAT_BOUNDS.minX);
  const z =
    HABITAT_BOUNDS.minZ +
    Math.random() * (HABITAT_BOUNDS.maxZ - HABITAT_BOUNDS.minZ);
  return clampToHabitat(x, z);
}

/** Distance on XZ plane */
export function distXZ(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  return Math.hypot(dx, dz);
}
