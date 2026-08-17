/**
 * Sprint 5 — Authoritative live runtime state.
 *
 * Actor writes body pose here every frame.
 * Director / debug / UI read it — do not invent a second pose.
 *
 * Store.position remains a soft mirror for React subscribers;
 * this module is the ground truth for x/y/platform/phase/speed.
 */

import type { Phase } from "@/components/mascot/Actor";

export type RuntimeBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  platformId: string | null;
  phase: Phase;
  speed: number;
  /** Screen CSS pixels (drag handle) */
  screenX: number;
  screenY: number;
  updatedAt: number;
};

const DEFAULT: RuntimeBody = {
  x: 1.05,
  y: -0.72,
  vx: 0,
  vy: 0,
  onGround: true,
  platformId: "home-corner",
  phase: "home",
  speed: 0,
  screenX: 0,
  screenY: 0,
  updatedAt: 0,
};

let runtime: RuntimeBody = { ...DEFAULT };

export function writeRuntime(
  partial: Partial<RuntimeBody> & Pick<RuntimeBody, "x" | "y">,
): RuntimeBody {
  runtime = {
    ...runtime,
    ...partial,
    updatedAt: Date.now(),
  };
  return runtime;
}

export function readRuntime(): RuntimeBody {
  return runtime;
}

export function runtimeIsHome(): boolean {
  return (
    runtime.phase === "home" ||
    runtime.platformId === "home-corner"
  );
}

export function runtimeIsBusyMoving(): boolean {
  return (
    runtime.phase === "outing" ||
    runtime.phase === "returning" ||
    (!runtime.onGround && runtime.phase !== "home")
  );
}

export function resetRuntime() {
  runtime = { ...DEFAULT, updatedAt: Date.now() };
}
