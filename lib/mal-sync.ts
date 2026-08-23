/**
 * Optional MAL sync layer (Multi-API Sprint 7).
 *
 * Pattern:
 *   User updates AnimeNexus watchlist → local state succeeds immediately
 *   → enqueue MAL mutation → background flush when OAuth is connected
 *
 * Without MAL OAuth credentials, the queue stays "pending" and never invents success.
 */

import type { WatchStatus } from "./types";

const QUEUE_KEY = "animenexus-mal-sync-queue-v1";
const STATUS_KEY = "animenexus-mal-sync-status-v1";

export type MalSyncMutation = {
  id: string;
  /** AniList catalog id when known */
  anilistId?: number;
  malId?: number;
  status?: WatchStatus;
  progress?: number;
  score?: number;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

export type MalSyncStatus = {
  /** true only after real OAuth token is stored (future) */
  connected: boolean;
  lastFlushAt?: string;
  pendingCount: number;
  lastError?: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readMalSyncQueue(): MalSyncMutation[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MalSyncMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(q: MalSyncMutation[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-200)));
}

export function readMalSyncStatus(): MalSyncStatus {
  const pendingCount = readMalSyncQueue().length;
  if (!canUseStorage()) {
    return { connected: false, pendingCount };
  }
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    const base = raw
      ? (JSON.parse(raw) as Partial<MalSyncStatus>)
      : {};
    return {
      connected: Boolean(base.connected),
      lastFlushAt: base.lastFlushAt,
      lastError: base.lastError,
      pendingCount,
    };
  } catch {
    return { connected: false, pendingCount };
  }
}

function writeStatus(s: Omit<MalSyncStatus, "pendingCount">) {
  if (!canUseStorage()) return;
  localStorage.setItem(
    STATUS_KEY,
    JSON.stringify({
      connected: s.connected,
      lastFlushAt: s.lastFlushAt,
      lastError: s.lastError,
    }),
  );
}

/** Enqueue after a successful local watchlist mutation. Never blocks UI. */
export function enqueueMalSync(
  partial: Omit<MalSyncMutation, "id" | "createdAt" | "attempts">,
): void {
  const q = readMalSyncQueue();
  // Coalesce by malId or anilistId
  const idx = q.findIndex(
    (m) =>
      (partial.malId && m.malId === partial.malId) ||
      (partial.anilistId && m.anilistId === partial.anilistId),
  );
  const next: MalSyncMutation = {
    id: `m${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    ...partial,
  };
  if (idx >= 0) {
    q[idx] = { ...q[idx], ...next, attempts: q[idx].attempts };
  } else {
    q.push(next);
  }
  writeQueue(q);
}

/**
 * Attempt flush. Without OAuth, records pending and returns false.
 * Future: call MAL API v2 with stored token.
 */
export async function flushMalSyncQueue(): Promise<{
  flushed: number;
  remaining: number;
  reason?: string;
}> {
  const status = readMalSyncStatus();
  const q = readMalSyncQueue();
  if (!q.length) {
    return { flushed: 0, remaining: 0 };
  }
  if (!status.connected) {
    writeStatus({
      connected: false,
      lastError: "MAL OAuth not connected — changes stay local",
    });
    return {
      flushed: 0,
      remaining: q.length,
      reason: "not_connected",
    };
  }

  // Placeholder for OAuth write path — do not pretend success
  writeStatus({
    connected: true,
    lastError: "MAL write API not configured in this build",
  });
  return {
    flushed: 0,
    remaining: q.length,
    reason: "oauth_not_configured",
  };
}

/** Dev/account UI: mark connection flag only (no token stored here). */
export function setMalConnectedFlag(connected: boolean) {
  writeStatus({
    connected,
    lastError: connected
      ? undefined
      : "Disconnected — queue will not flush",
  });
}

export function clearMalSyncQueue() {
  writeQueue([]);
}
