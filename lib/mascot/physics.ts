/**
 * Lightweight kinematic physics for the habitat.
 * Supports elevated platforms (climb targets).
 */

export type PhysicsBody = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  onGround: boolean;
  /** Current floor height (0 = main floor, >0 = platform) */
  floorY: number;
};

export type Platform = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  id: string;
};

export const GRAVITY = -9.5;
export const BASE_FLOOR_Y = 0;
export const BOUNCE = 0.28;
export const FRICTION = 0.86;

/** Habitat ledges the companion can hop onto */
export const HABITAT_PLATFORMS: Platform[] = [
  { id: "ledge-left", minX: -0.55, maxX: -0.28, minZ: -0.1, maxZ: 0.25, y: 0.35 },
  { id: "ledge-right", minX: 0.28, maxX: 0.55, minZ: -0.1, maxZ: 0.25, y: 0.28 },
];

export function createBody(x = 0, z = 0): PhysicsBody {
  return { x, y: 0, z, vx: 0, vy: 0, vz: 0, onGround: true, floorY: 0 };
}

function platformAt(x: number, z: number): Platform | null {
  for (const p of HABITAT_PLATFORMS) {
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) return p;
  }
  return null;
}

export function stepPhysics(body: PhysicsBody, dt: number): PhysicsBody {
  const b = { ...body };
  if (!b.onGround) {
    b.vy += GRAVITY * dt;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.z += b.vz * dt;

  const plat = platformAt(b.x, b.z);
  const floor = plat ? plat.y : BASE_FLOOR_Y;

  // Land on platform only when falling onto it from above
  if (b.y <= floor && b.vy <= 0) {
    // If we were on a higher floor and walked off, fall
    if (b.floorY > floor + 0.05 && b.y > floor + 0.02) {
      b.onGround = false;
      b.floorY = floor;
    } else {
      b.y = floor;
      b.floorY = floor;
      if (b.vy < -0.4) {
        b.vy = -b.vy * BOUNCE;
        b.onGround = false;
        if (Math.abs(b.vy) < 0.35) {
          b.vy = 0;
          b.onGround = true;
        }
      } else {
        b.vy = 0;
        b.onGround = true;
      }
      b.vx *= FRICTION;
      b.vz *= FRICTION;
    }
  }

  if (b.onGround) {
    b.vx *= 0.92;
    b.vz *= 0.92;
    if (Math.hypot(b.vx, b.vz) < 0.02) {
      b.vx = 0;
      b.vz = 0;
    }
    // Walked off platform?
    const still = platformAt(b.x, b.z);
    if (b.floorY > 0.05 && !still) {
      b.onGround = false;
      b.floorY = 0;
    }
  }

  return b;
}

export function applyJump(body: PhysicsBody, strength = 3.2): PhysicsBody {
  if (!body.onGround) return body;
  return {
    ...body,
    vy: strength,
    onGround: false,
  };
}

/** Jump toward a platform (climb assist). */
export function applyClimbJump(body: PhysicsBody, targetY: number): PhysicsBody {
  const need = Math.max(2.4, 2.0 + (targetY - body.y) * 4);
  return applyJump(body, need);
}

export function steerToward(
  body: PhysicsBody,
  tx: number,
  tz: number,
  speed: number,
  _dt: number,
): PhysicsBody {
  const dx = tx - body.x;
  const dz = tz - body.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.03) {
    return { ...body, vx: body.vx * 0.5, vz: body.vz * 0.5 };
  }
  const ax = (dx / d) * speed;
  const az = (dz / d) * speed;
  return {
    ...body,
    vx: body.vx * 0.7 + ax * 0.3,
    vz: body.vz * 0.7 + az * 0.3,
  };
}

export function teleportBody(
  body: PhysicsBody,
  x: number,
  z: number,
): PhysicsBody {
  const plat = platformAt(x, z);
  const floor = plat ? plat.y : BASE_FLOOR_Y;
  return {
    ...body,
    x,
    z,
    y: floor,
    floorY: floor,
    vx: 0,
    vz: 0,
    vy: 0,
    onGround: true,
  };
}
