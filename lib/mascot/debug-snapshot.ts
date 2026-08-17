/**
 * Sprint 8 — Read-only debug snapshot for polish / QA.
 * Safe to call from a debug panel or console:
 *   import { mascotDebugSnapshot } from '@/lib/mascot/debug-snapshot'
 *   console.table(mascotDebugSnapshot())
 */

import { useMascotStore } from "./store";
import { readRuntime } from "./runtime";
import { peekMovementCommand } from "./movement-command";
import { getClimbState, isClimbing } from "./climbing";
import { resolveExpression } from "./expression-pipeline";

export type MascotDebugSnapshot = {
  intention: string;
  goal: string;
  anim: string;
  expression: string;
  directorReason: string | null;
  thought: string | null;
  target: { x: number; y: number } | null;
  runtime: {
    x: number;
    y: number;
    phase: string;
    platformId: string | null;
    onGround: boolean;
    speed: number;
  };
  command: {
    id: string;
    reason: string;
    mode: string;
    target: { x: number; y: number };
  } | null;
  climbing: boolean;
  climbPhase: string;
  enabled: boolean;
};

export function mascotDebugSnapshot(): MascotDebugSnapshot {
  const s = useMascotStore.getState();
  const rt = readRuntime();
  const cmd = peekMovementCommand();
  const climb = getClimbState();

  return {
    intention: s.intention,
    goal: s.goal,
    anim: s.anim,
    expression: resolveExpression({
      anim: s.anim,
      emotions: s.emotions,
      socialActive: s.layers.social !== "none",
      climbPhase: isClimbing(climb) ? climb.phase : null,
    }),
    directorReason: s.lastDirectorReason,
    thought: s.lastThought,
    target: s.target,
    runtime: {
      x: +rt.x.toFixed(3),
      y: +rt.y.toFixed(3),
      phase: rt.phase,
      platformId: rt.platformId,
      onGround: rt.onGround,
      speed: +rt.speed.toFixed(3),
    },
    command: cmd
      ? {
          id: cmd.id,
          reason: cmd.reason,
          mode: cmd.mode,
          target: {
            x: +cmd.target.x.toFixed(3),
            y: +cmd.target.y.toFixed(3),
          },
        }
      : null,
    climbing: isClimbing(climb),
    climbPhase: climb.phase,
    enabled: s.enabled,
  };
}

/** Attach to window in dev for quick inspection. */
export function installMascotDebugGlobal() {
  if (typeof window === "undefined") return;
  (window as unknown as { __mascotDebug?: () => MascotDebugSnapshot }).__mascotDebug =
    mascotDebugSnapshot;
}
