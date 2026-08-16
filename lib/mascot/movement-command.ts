/**
 * Sprint 3 — Brain → Body movement channel.
 *
 * Director / store / UI interactions issue MovementCommands.
 * Actor consumes them for locomotion instead of inventing destinations.
 *
 * RULE: Command issuers do not touch Three.js meshes.
 * RULE: Actor does not choose *why* to move when a command is active.
 */

import type { WorldPoint } from "./world-coords";
import { clampWorld } from "./world-coords";

export type LocomotionMode =
  | "walk"
  | "run"
  | "jump"
  | "idle"
  | "return-home";

export type MovementCommand = {
  id: string;
  /** Page-world destination */
  target: WorldPoint;
  /** Optional terrain platform id when known */
  platformId?: string;
  mode: LocomotionMode;
  /** Multiplier on walk speed (0.5–2) */
  speed: number;
  /** 0–1 — higher interrupts lower-priority ambient roam sooner */
  urgency: number;
  interruptible: boolean;
  reason: string;
  issuedAt: number;
  expiresAt: number;
};

let current: MovementCommand | null = null;
let seq = 0;

export type IssueMovementOpts = {
  target: WorldPoint;
  platformId?: string;
  mode?: LocomotionMode;
  speed?: number;
  urgency?: number;
  interruptible?: boolean;
  reason?: string;
  /** Hold duration before auto-expire (ms) */
  ttlMs?: number;
};

export function issueMovementCommand(opts: IssueMovementOpts): MovementCommand {
  const now = Date.now();
  const existing = current;
  if (
    existing &&
    !existing.interruptible &&
    now < existing.expiresAt &&
    (opts.urgency ?? 0.5) < existing.urgency
  ) {
    return existing;
  }

  const cmd: MovementCommand = {
    id: `mv-${++seq}-${now}`,
    target: clampWorld(opts.target.x, opts.target.y),
    platformId: opts.platformId,
    mode: opts.mode ?? "walk",
    speed: Math.max(0.4, Math.min(2.2, opts.speed ?? 1)),
    urgency: Math.max(0, Math.min(1, opts.urgency ?? 0.5)),
    interruptible: opts.interruptible ?? true,
    reason: opts.reason ?? "command",
    issuedAt: now,
    expiresAt: now + (opts.ttlMs ?? 12_000),
  };
  current = cmd;
  return cmd;
}

export function peekMovementCommand(): MovementCommand | null {
  if (!current) return null;
  if (Date.now() > current.expiresAt) {
    current = null;
    return null;
  }
  return current;
}

export function clearMovementCommand(id?: string) {
  if (!current) return;
  if (id && current.id !== id) return;
  current = null;
}

/** True when brain has an active destination the body should honor. */
export function hasActiveMovementCommand(): boolean {
  return peekMovementCommand() != null;
}

/** Issue return-home when Director sets goHome. */
export function issueReturnHome(home: WorldPoint, reason = "director:goHome") {
  return issueMovementCommand({
    target: home,
    platformId: "home-corner",
    mode: "return-home",
    speed: 1.1,
    urgency: 0.75,
    interruptible: true,
    reason,
    ttlMs: 16_000,
  });
}

/** Map store target point into a movement command. */
export function issueFromStoreTarget(
  target: WorldPoint,
  reason = "store:target",
  platformId?: string,
) {
  return issueMovementCommand({
    target,
    platformId,
    mode: "walk",
    speed: 1,
    urgency: 0.65,
    interruptible: true,
    reason,
    ttlMs: 14_000,
  });
}
