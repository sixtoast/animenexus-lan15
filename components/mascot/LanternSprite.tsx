"use client";

/**
 * REMOVED as product UI.
 * 3D LiveTerrain is the only companion renderer.
 * This file is kept empty-export so old imports fail loudly at typecheck
 * if any residual path still references it.
 */
export function LanternSprite(): null {
  if (process.env.NODE_ENV === "development") {
    console.error(
      "[Lantern-ko] LanternSprite is retired. Use LiveTerrain (3D) only.",
    );
  }
  return null;
}
