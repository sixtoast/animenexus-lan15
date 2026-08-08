/** 2.5D terrain locomotion — tight at home, free when out */

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
const BOUNCE = 0.32;

export const nearestPlatform = nearestPlatformFromTerrain;

export function createTerrainBody(x = 0, y = -0.7): TerrainBody {
  return { x, y, vx: 0, vy: 0, onGround: true, platformId: "viewport-floor" };
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
  const b = { ...body };
  if (!b.onGround) {
    b.vy += GRAVITY * dt;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  const support = supportY(b, platforms);
  if (support !== null && b.vy <= 0) {
    b.y = support;
    if (b.vy < -1.2) {
      // Springy landing when freed
      b.vy = -b.vy * (freed ? BOUNCE * 1.35 : BOUNCE);
      b.onGround = false;
    } else {
      b.vy = 0;
      b.onGround = true;
    }
    // Less friction when free — keeps sliding / hopping
    b.vx *= freed ? 0.96 : 0.88;
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
  return b;
}

export function steerTerrain(
  body: TerrainBody,
  tx: number,
  ty: number,
  speed: number,
  freed = false,
): TerrainBody {
  const dx = tx - body.x;
  const dy = ty - body.y;
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

/** Bigger arcs when freed */
export function jumpToward(
  body: TerrainBody,
  target: TerrainPlatform,
  freed = false,
): TerrainBody {
  if (!body.onGround) return body;
  const dy = target.y + target.hh - body.y;
  const up = Math.max(
    freed ? 3.2 : 2.5,
    (freed ? 2.6 : 2.0) + dy * (freed ? 3.6 : 3),
  );
  return {
    ...body,
    vy: up,
    vx: (target.x - body.x) * (freed ? 1.55 : 1.2),
    onGround: false,
  };
}

/** Spontaneous hop in place / sideways — free energy */
export function freeHop(
  body: TerrainBody,
  dirX = (Math.random() - 0.5) * 2,
): TerrainBody {
  if (!body.onGround) return body;
  return {
    ...body,
    vy: 2.4 + Math.random() * 1.4,
    vx: body.vx * 0.3 + dirX * (0.9 + Math.random() * 1.1),
    onGround: false,
  };
}

export function snapToPlatform(
  body: TerrainBody,
  p: TerrainPlatform,
): TerrainBody {
  return {
    ...body,
    x: p.x,
    y: p.y + p.hh,
    vx: 0,
    vy: 0,
    onGround: true,
    platformId: p.id,
  };
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
