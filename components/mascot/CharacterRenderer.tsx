"use client";

/**
 * Sprint 1 — Authoritative character visual path.
 *
 * Architecture:
 *   Actor / Locomotion → CharacterRenderer → GltfCompanion | LanternKoMesh
 *
 * RULE: This module must never decide behaviour, intention, or terrain.
 * It only renders pose inputs (expression, anim, yaw, speed, land).
 */

import type { ExpressionKey } from "./LanternKoMeshV2";
import { GltfCompanion } from "./GltfCompanion";

export type CharacterRendererProps = {
  expression: ExpressionKey;
  /** Locomotion / social anim label from store (idle, walk, jump, …) */
  anim: string;
  yaw?: number;
  speed?: number;
  justLanded?: boolean;
  /** Uniform scale for page-terrain size (Actor historically ~0.58) */
  scale?: number;
};

/**
 * Single entry for live + habitat visuals.
 * Prefer GLB when present; always falls back to procedural Lantern-ko.
 */
export function CharacterRenderer({
  expression,
  anim,
  yaw = 0,
  speed = 0,
  justLanded = false,
  scale = 1,
}: CharacterRendererProps) {
  return (
    <group scale={scale}>
      <GltfCompanion
        expression={expression}
        anim={anim}
        yaw={yaw}
        speed={speed}
        justLanded={justLanded}
      />
    </group>
  );
}
