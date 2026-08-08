/** 2.5D terrain locomotion — tight at home, free when out (stays on-screen) */

import type { TerrainPlatform } from "./page-terrain";
import { nearestPlatform as nearestPlatformFromTerrain } from "./page-terrain";

export type TerrainBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  platformId: string | null;
};

const GRAVITY = -11.5;
const BOUNCE = 0.28;

export const nearestPlatform = nearestPlatformFromTerrain;

export function createTerrainBody(x = 0, y = -0.7): TerrainBody {
  return { x, y, vx: 0, vy: 0, onGround: true, platformId: "viewport-floor" };
}

/** Safe play area in orthographic world units (margin from edges). */
export function viewportBounds(margin = 0.12): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  if (typeof window === "undefined") {
    return { minX: -1.2, maxX: 1.2, minY: -0.85, maxY: 0.75 };
  }
  const aspect = window.innerWidth / (window.innerHeight || 1);
  return {
    minX: -aspect + margin,
    maxX: aspect - margin,
    minY: -1 + margin + 0.05,
    maxY: 1 - margin - 0.08,
  };
}

export function clampToViewport(body: TerrainBody, margin = 0.12): TerrainBody {
  const b = viewportBounds(margin);
  let { x, y, vx, vy } = body;
  if (x < b.minX) {
    x = b.minX;
    vx = Math.abs(vx) * 0.35;
  } else if (x > b.maxX) {
    x = b.maxX;
    vx = -Math.abs(vx) * 0.35;
  }
  if (y < b.minY) {
    y = b.minY;
    vy = Math.max(0, Math.abs(vy) * 0.25);
  } else if (y > b.maxY) {
    y = b.maxY;
    vy = -Math.abs(vy) * 0.2;
  }
  // Cap speed so they can't rocket past the clamp next frame
  const maxV = 3.2;
  vx = Math.max(-maxV, Math.min(maxV, vx));
  vy = Math.max(-maxV * 1.2, Math.min(maxV * 1.2, vy));
  return { ...body, x, y, vx, vy };
}

function supportY(
  body: TerrainBody,
  platforms: TerrainPlatform[],
): number | null {
  let best: number | null = null;
  let bestId: string | null = null;
  for (const p of platforms) {
    if (Math.abs(body.x - p.x) <= p.hw + 0.04) {
      const top = p.y + p.hh;
      if (body.y <= top + 0.08 && body.y >= top - 0.32) {
        if (best === null || top > best) {
          best = top;
          bestId = p.id;
        }
      }
    }
  }
  if (bestId) body.platformId = bestId;
  return best;
}

export function stepTerrain(
  body: TerrainBody,
  platforms: TerrainPlatform[],
  dt: number,
  freed = false,
): TerrainBody {
  let b = { ...body };
  if (!b.onGround) {
    b.vy += GRAVITY * dt;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  const support = supportY(b, platforms);
  if (support !== null && b.vy <= 0) {
    b.y = support;
    if (b.vy < -1.2) {
      b.vy = -b.vy * (freed ? BOUNCE * 1.2 : BOUNCE);
      b.onGround = false;
    } else {
      b.vy = 0;
      b.onGround = true;
    }
    b.vx *= freed ? 0.94 : 0.88;
  } else if (support === null) {
    b.onGround = false;
    if (b.y < -2.5) {
      b.y = -0.85;
      b.vy = 0;
      b.onGround = true;
      b.platformId = "viewport-floor";
    }
  }

  if (b.onGround && Math.abs(b.vx) < (freed ? 0.01 : 0.02)) b.vx = 0;

  if (freed) b = clampToViewport(b);
  return b;
}

export function steerTerrain(
  body: TerrainBody,
  tx: number,
  ty: number,
  speed: number,
  freed = false,
): TerrainBody {
  const bounds = viewportBounds();
  const cx = Math.max(bounds.minX, Math.min(bounds.maxX, tx));
  const cy = Math.max(bounds.minY, Math.min(bounds.maxY, ty));
  const dx = cx - body.x;
  const dy = cy - body.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.04) return { ...body, vx: 0, vy: body.onGround ? 0 : body.vy };
  const blend = freed ? 0.55 : 0.4;
  const keep = freed ? 0.45 : 0.6;
  return {
    ...body,
    vx: body.vx * keep + (dx / d) * speed * blend,
    vy: body.onGround ? body.vy : body.vy,
  };
}

export function jumpToward(
  body: TerrainBody,
  target: TerrainPlatform,
  freed = false,
): TerrainBody {
  if (!body.onGround) return body;
  const bounds = viewportBounds();
  const tx = Math.max(bounds.minX, Math.min(bounds.maxX, target.x));
  const ty = Math.max(
    bounds.minY,
    Math.min(bounds.maxY, target.y + target.hh),
  );
  const dy = ty - body.y;
  // Gentler arcs so they don't leave the frame
  const up = Math.max(
    freed ? 2.2 : 2.0,
    Math.min(freed ? 3.4 : 2.8, (freed ? 2.1 : 1.9) + Math.max(0, dy) * 2.4),
  );
  let vx = (tx - body.x) * (freed ? 1.15 : 1.0);
  vx = Math.max(-2.4, Math.min(2.4, vx));
  return clampToViewport({
    ...body,
    vy: up,
    vx,
    onGround: false,
  });
}

/** Small hop that stays inside the viewport */
export function freeHop(body: TerrainBody): TerrainBody {
  if (!body.onGround) return body;
  const bounds = viewportBounds();
  // Prefer hopping toward center if near an edge
  const midX = (bounds.minX + bounds.maxX) * 0.5;
  const nearEdge =
    body.x < bounds.minX + 0.25 || body.x > bounds.maxX - 0.25;
  let dirX = nearEdge
    ? Math.sign(midX - body.x) * (0.4 + Math.random() * 0.5)
    : (Math.random() - 0.5) * 1.2;
  dirX = Math.max(-1.3, Math.min(1.3, dirX));
  return clampToViewport({
    ...body,
    vy: 1.6 + Math.random() * 0.9,
    vx: body.vx * 0.25 + dirX,
    onGround: false,
  });
}

export function snapToPlatform(
  body: TerrainBody,
  p: TerrainPlatform,
): TerrainBody {
  return clampToViewport({
    ...body,
    x: p.x,
    y: p.y + p.hh,
    vx: 0,
    vy: 0,
    onGround: true,
    platformId: p.id,
  });
}

export function isNearPlatform(
  body: TerrainBody,
  p: TerrainPlatform,
  pad = 0.12,
): boolean {
  return (
    Math.abs(body.x - p.x) <= p.hw + pad &&
    Math.abs(body.y - (p.y + p.hh)) <= pad + 0.1
  );
}

/** Platform center is currently on-screen (with margin). */
export function platformInView(p: TerrainPlatform, margin = 0.1): boolean {
  const b = viewportBounds(margin);
  const top = p.y + p.hh;
  return p.x >= b.minX && p.x <= b.maxX && top >= b.minY && top <= b.maxY;
}
