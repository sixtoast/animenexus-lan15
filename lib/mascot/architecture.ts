/**
 * Sprint 8 — Architecture map (source of truth for humans + future refactors)
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Director (intention) + emotions + UI events                 │
 * └──────────────────────────┬──────────────────────────────────┘
 *                            ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  brain-targets / climbing / wire-movement                    │
 * │  → MovementCommand (page-world x/y)                          │
 * └──────────────────────────┬──────────────────────────────────┘
 *                            ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Actor — physics only (hop queue, steer, clamp, drag)        │
 * │  writes runtime.ts every frame                               │
 * └──────────────────────────┬──────────────────────────────────┘
 *                            ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  expression-pipeline → ExpressionKey                         │
 * │  CharacterRenderer → GltfCompanion | LanternKoMeshV2         │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Coordinates: lib/mascot/world-coords.ts (canonical page x/y)
 * Debug:       lib/mascot/debug-snapshot.ts → window.__mascotDebug()
 *
 * DO NOT:
 *  - Invent destinations inside Actor
 *  - Use habitat x/z for live path (legacy alias only)
 *  - Put AI inside CharacterRenderer
 */

export const MASCOT_ARCHITECTURE_VERSION = "sprints-1-8";

export const MASCOT_MODULE_MAP = {
  coords: "lib/mascot/world-coords.ts",
  commands: "lib/mascot/movement-command.ts",
  runtime: "lib/mascot/runtime.ts",
  climb: "lib/mascot/climbing.ts",
  expression: "lib/mascot/expression-pipeline.ts",
  brainTargets: "lib/mascot/brain-targets.ts",
  wire: "lib/mascot/wire-movement.ts",
  actor: "components/mascot/Actor.tsx",
  renderer: "components/mascot/CharacterRenderer.tsx",
  host: "components/mascot/LiveTerrain.tsx",
  debug: "lib/mascot/debug-snapshot.ts",
} as const;
