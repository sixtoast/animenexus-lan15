/**
 * Recommendation outcome chain (V2.1).
 * Ties rec exposure → open → start → progress → complete → rewatch
 * so ranking can optimise completion, not only clicks.
 */

import { logBehaviour } from "./behaviour-events";

const KEY = "anime_nexus_outcomes_v1";
const MAX = 200;

export type OutcomeStage =
  | "shown"
  | "opened"
  | "watchlisted"
  | "started"
  | "progress_25"
  | "progress_75"
  | "completed"
  | "rewatched"
  | "dropped";

export type OutcomeRecord = {
  animeId: number;
  stage: OutcomeStage;
  at: string;
  /** Ranker version label for experiments */
  ranker?: string;
  /** Optional rec surface id */
  surface?: string;
};

const STAGE_WEIGHT: Record<OutcomeStage, number> = {
  shown: 0.05,
  opened: 0.4,
  watchlisted: 1.2,
  started: 2.5,
  progress_25: 3.5,
  progress_75: 5,
  completed: 8,
  rewatched: 12,
  dropped: -4,
};

function readAll(): OutcomeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

function writeAll(list: OutcomeRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* */
  }
}

export function logOutcome(
  animeId: number,
  stage: OutcomeStage,
  opts?: { ranker?: string; surface?: string },
): void {
  if (typeof window === "undefined") return;
  const rec: OutcomeRecord = {
    animeId,
    stage,
    at: new Date().toISOString(),
    ranker: opts?.ranker ?? "ranker_v2",
    surface: opts?.surface,
  };
  const prev = readAll().filter(
    (r) => !(r.animeId === animeId && r.stage === stage),
  );
  writeAll([rec, ...prev]);

  // Mirror into behaviour store with outcome-aware weights
  const map: Partial<Record<OutcomeStage, Parameters<typeof logBehaviour>[0]>> =
    {
      opened: "rec_open",
      watchlisted: "rec_accept",
      started: "start",
      progress_25: "progress",
      progress_75: "progress",
      completed: "complete",
      rewatched: "rewatch",
      dropped: "drop",
      shown: "rec_shown",
    };
  const kind = map[stage];
  if (kind) {
    logBehaviour(kind, {
      animeId,
      weight: STAGE_WEIGHT[stage],
      meta: { reason: stage },
    });
  }
}

export function outcomesFor(animeId: number): OutcomeRecord[] {
  return readAll().filter((r) => r.animeId === animeId);
}

/** Completion-weighted affinity boost for ranking. */
export function outcomeBoost(animeId: number): number {
  const list = outcomesFor(animeId);
  if (!list.length) return 0;
  let s = 0;
  for (const r of list) {
    const age =
      (Date.now() - new Date(r.at).getTime()) / (24 * 60 * 60 * 1000);
    const decay = Math.exp(-age / 60);
    s += STAGE_WEIGHT[r.stage] * decay;
  }
  return Math.tanh(s / 10);
}

export function outcomeStats(): {
  completed: number;
  started: number;
  dropped: number;
  completionRate: number | null;
} {
  const all = readAll();
  const completed = all.filter((r) => r.stage === "completed").length;
  const started = all.filter((r) => r.stage === "started").length;
  const dropped = all.filter((r) => r.stage === "dropped").length;
  const denom = started + completed;
  return {
    completed,
    started,
    dropped,
    completionRate: denom > 0 ? completed / denom : null,
  };
}

/** Hook from watchlist status/progress changes. */
export function noteWatchlistOutcome(
  animeId: number,
  next: { status?: string; progress?: number; episodes?: number | string },
  prev?: { status?: string; progress?: number },
): void {
  const status = next.status;
  if (status === "watching" && prev?.status !== "watching") {
    logOutcome(animeId, "started");
  }
  if (status === "completed" && prev?.status !== "completed") {
    logOutcome(animeId, "completed");
  }
  if (status === "rewatching") {
    logOutcome(animeId, "rewatched");
  }
  if (status === "dropped" && prev?.status !== "dropped") {
    logOutcome(animeId, "dropped");
  }
  if (status === "planning" && prev?.status !== "planning") {
    logOutcome(animeId, "watchlisted");
  }

  const eps =
    typeof next.episodes === "number"
      ? next.episodes
      : parseInt(String(next.episodes || ""), 10) || 0;
  const prog = next.progress ?? 0;
  if (eps > 0 && prog > 0) {
    const ratio = prog / eps;
    if (ratio >= 0.75) logOutcome(animeId, "progress_75");
    else if (ratio >= 0.25) logOutcome(animeId, "progress_25");
  }
}
