/**
 * Sprint 2 — Canonical live mascot world coordinates.
 *
 * Live path (LiveTerrain / Actor / terrain-physics) uses PAGE WORLD:
 *   x — horizontal (aspect-scaled NDC)
 *   y — vertical (NDC-style, +up)
 *
 * Legacy habitat used x/z on a desk plane. Bridge helpers map z ↔ y so
 * Director / store targets can be expressed in the same space Actor walks.
 *
 * RULE: Prefer these functions over ad-hoc clientX/viewport math elsewhere.
 */

export type WorldPoint = {
  x: number;
  y: number;
};

/** @deprecated Prefer WorldPoint — habitat used z as depth */
export type HabitatPoint = {
  x: number;
  z: number;
};

/** Soft bounds for free roam on the page plane (not viewport hard clamp). */
export const WORLD_BOUNDS = {
  minX: -2.4,
  maxX: 2.4,
  minY: -1.15,
  maxY: 1.15,
} as const;

/** Legacy habitat desk bounds (kept for habitat scene only). */
export const HABITAT_BOUNDS = {
  minX: -0.55,
  maxX: 0.55,
  minZ: -0.25,
  maxZ: 0.25,
} as const;

export function getViewportSize(): { vw: number; vh: number; aspect: number } {
  if (typeof window === "undefined") {
    return { vw: 1280, vh: 720, aspect: 1280 / 720 };
  }
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  return { vw, vh, aspect: vw / vh };
}

/** Client (CSS pixel) → page world. Matches LiveTerrain orthographic mapping. */
export function screenToWorld(clientX: number, clientY: number): WorldPoint {
  const { vw, vh, aspect } = getViewportSize();
  const x = ((clientX / vw) * 2 - 1) * aspect;
  const y = -((clientY / vh) * 2 - 1);
  return { x, y };
}

/** Page world → client (CSS pixel). */
export function worldToScreen(x: number, y: number): { clientX: number; clientY: number } {
  const { vw, vh, aspect } = getViewportSize();
  const clientX = ((x / aspect + 1) / 2) * vw;
  const clientY = ((-y + 1) / 2) * vh;
  return { clientX, clientY };
}

/** DOMRect center (and half extents) in page world. */
export function domRectToWorld(r: DOMRect): {
  center: WorldPoint;
  hw: number;
  hh: number;
  clientX: number;
  clientY: number;
} | null {
  const { vw, vh, aspect } = getViewportSize();
  if (r.width < 10 || r.height < 10) return null;

  const left = Math.max(0, r.left);
  const right = Math.min(vw, r.right);
  const top = Math.max(0, r.top);
  const bottom = Math.min(vh, r.bottom);
  const w = right - left;
  const h = bottom - top;
  if (w < 10 || h < 10) return null;

  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const center = screenToWorld(cx, cy);
  const hw = Math.max(0.04, (w / vw) * aspect * 0.96);
  const hh = Math.max(0.025, (h / vh) * 0.96 * 0.5);
  return { center, hw, hh, clientX: cx, clientY: cy };
}

export function clampWorld(x: number, y: number): WorldPoint {
  return {
    x: Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, x)),
    y: Math.max(WORLD_BOUNDS.minY, Math.min(WORLD_BOUNDS.maxY, y)),
  };
}

/** Map legacy habitat (x/z) → page world (x/y). z becomes vertical y. */
export function habitatToWorld(h: HabitatPoint): WorldPoint {
  return { x: h.x, y: h.z };
}

/** Map page world → legacy habitat shape (y written as z). */
export function worldToHabitat(w: WorldPoint): HabitatPoint {
  return { x: w.x, z: w.y };
}

/**
 * Screen → world target for Director / store.
 * Replaces the old screenToHabitatTarget nonlinear mapping.
 */
export function screenToWorldTarget(clientX: number, clientY: number): WorldPoint {
  return clampWorld(...Object.values(screenToWorld(clientX, clientY)) as [number, number]);
}

// Avoid tuple spread issues in some TS targets
export function screenToWorldTargetSafe(
  clientX: number,
  clientY: number,
): WorldPoint {
  const p = screenToWorld(clientX, clientY);
  return clampWorld(p.x, p.y);
}

export function distWorld(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.hypot(bx - ax, by - ay);
}
