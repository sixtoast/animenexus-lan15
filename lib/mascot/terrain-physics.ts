/** 2.5D terrain locomotion for page-as-terrain mode */

import type { TerrainPlatform } from "./page-terrain";

export type TerrainBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  platformId: string | null;
};

const GRAVITY = -14;
const BOUNCE = 0.15;

export function createTerrainBody(x = 0, y = -0.7): TerrainBody {
  return { x, y, vx: 0, vy: 0, onGround: true, platformId: "viewport-floor" };
}

export function nearestPlatform(
  platforms: TerrainPlatform[],
  x: number,
  y: number,
): TerrainPlatform | null {
  let best: TerrainPlatform | null = null;
  let bestD = Infinity;
  for (const p of platforms) {
    const dx = Math.max(Math.abs(x - p.x) - p.hw, 0);
    const dy = Math.max(Math.abs(y - p.y) - p.hh, 0);
    const d = Math.hypot(dx, dy);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function supportY(body: TerrainBody, platforms: TerrainPlatform[]): number | null {
  let best: number | null = null;
  let bestId: string | null = null;
  for (const p of platforms) {
    if (Math.abs(body.x - p.x) <= p.hw + 0.02) {
      const top = p.y + p.hh;
      if (body.y <= top + 0.06 && body.y >= top - 0.25) {
        if (best === null || top > best) {
          best = top;
          bestId = p.id;
        }
      }
    }
  }
  if (bestId) {
    body.platformId = bestId;
  }
  return best;
}

export function stepTerrain(
  body: TerrainBody,
  platforms: TerrainPlatform[],
  dt: number,
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
    if (b.vy < -1) {
      b.vy = -b.vy * BOUNCE;
      b.onGround = false;
    } else {
      b.vy = 0;
      b.onGround = true;
    }
    b.vx *= 0.88;
  } else if (support === null) {
    b.onGround = false;
    if (b.y < -2.5) {
      b.y = -0.85;
      b.vy = 0;
      b.onGround = true;
      b.platformId = "viewport-floor";
    }
  }

  if (b.onGround && Math.abs(b.vx) < 0.02) b.vx = 0;
  return b;
}

export function steerTerrain(
  body: TerrainBody,
  tx: number,
  ty: number,
  speed: number,
): TerrainBody {
  const dx = tx - body.x;
  const dy = ty - body.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.04) return { ...body, vx: 0, vy: body.onGround ? 0 : body.vy };
  return {
    ...body,
    vx: body.vx * 0.6 + (dx / d) * speed * 0.4,
    vy: body.onGround ? body.vy : body.vy,
  };
}

export function jumpToward(
  body: TerrainBody,
  target: TerrainPlatform,
): TerrainBody {
  if (!body.onGround) return body;
  const up = Math.max(2.5, 2.0 + (target.y - body.y) * 3);
  return {
    ...body,
    vy: up,
    vx: (target.x - body.x) * 1.2,
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
