/**
 * Implicit behaviour store (Recommendation Engine V2).
 * Not observing ≠ dislike. Exposure is tracked separately from engagement.
 */

const KEY = "anime_nexus_behaviour_v1";
const MAX = 400;

const SESSION_KEY = "anime_nexus_behaviour_session_v1";

/** Stable for the tab lifetime; soft-fail empty on SSR. */
export function getBehaviourSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (s && s.length >= 8) return s;
    s = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, s);
    return s;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
}

export type BehaviourKind =
  | "exposure"
  | "hover"
  | "detail_open"
  | "detail_revisit"
  | "search"
  | "filter"
  | "watchlist_add"
  | "watchlist_remove"
  | "start"
  | "progress"
  | "complete"
  | "rewatch"
  | "drop"
  | "rec_shown"
  | "rec_open"
  | "rec_accept"
  | "rec_reject";

export type BehaviourEvent = {
  id: string;
  at: string;
  kind: BehaviourKind;
  animeId?: number;
  weight: number;
  /** Browser session bucket for attribution (not auth user id) */
  sessionId?: string;
  /** Links outcomes back to a ranked recommendation set when known */
  recommendationId?: string;
  /** Candidate / shelf source label when known */
  source?: string;
  meta?: {
    visibleMs?: number;
    position?: number;
    query?: string;
    filter?: string;
    progress?: number;
    reason?: string;
    shelf?: string;
    intersectionRatio?: number;
  };
};

export const KIND_WEIGHT: Record<BehaviourKind, number> = {
  exposure: 0.05,
  hover: 0.15,
  detail_open: 1,
  detail_revisit: 2,
  search: 2.5,
  filter: 1.2,
  watchlist_add: 3,
  watchlist_remove: -0.8,
  start: 4,
  progress: 5,
  complete: 7,
  rewatch: 10,
  drop: -3,
  rec_shown: 0.1,
  rec_open: 1.5,
  rec_accept: 3.5,
  rec_reject: -1.5,
};

function readAll(): BehaviourEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

function writeAll(list: BehaviourEvent[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* quota */
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logBehaviour(
  kind: BehaviourKind,
  opts?: {
    animeId?: number;
    meta?: BehaviourEvent["meta"];
    weight?: number;
    recommendationId?: string;
    source?: string;
  },
): void {
  if (typeof window === "undefined") return;
  const weight = opts?.weight ?? KIND_WEIGHT[kind];
  const ev: BehaviourEvent = {
    id: uid(),
    at: new Date().toISOString(),
    kind,
    animeId: opts?.animeId,
    weight,
    sessionId: getBehaviourSessionId() || undefined,
    recommendationId: opts?.recommendationId,
    source: opts?.source,
    meta: opts?.meta,
  };
  writeAll([ev, ...readAll()]);
}

/**
 * Meaningful exposure only — caller should gate on visibility threshold + dwell.
 * Non-exposure is never treated as dislike.
 */
export function logMeaningfulExposure(opts: {
  animeId: number;
  visibleMs: number;
  position?: number;
  shelf?: string;
  recommendationId?: string;
  source?: string;
  intersectionRatio?: number;
}): void {
  if (opts.visibleMs < 1500) return;
  logBehaviour("exposure", {
    animeId: opts.animeId,
    recommendationId: opts.recommendationId,
    source: opts.source,
    meta: {
      visibleMs: opts.visibleMs,
      position: opts.position,
      shelf: opts.shelf,
      intersectionRatio: opts.intersectionRatio,
    },
  });
  logBehaviour("rec_shown", {
    animeId: opts.animeId,
    recommendationId: opts.recommendationId,
    source: opts.source,
    weight: 0.12,
    meta: {
      visibleMs: opts.visibleMs,
      position: opts.position,
      shelf: opts.shelf,
    },
  });
}

export function readBehaviourEvents(opts?: {
  sinceMs?: number;
  kinds?: BehaviourKind[];
  animeId?: number;
}): BehaviourEvent[] {
  let list = readAll();
  if (opts?.sinceMs != null) {
    const cut = Date.now() - opts.sinceMs;
    list = list.filter((e) => new Date(e.at).getTime() >= cut);
  }
  if (opts?.kinds?.length) {
    const s = new Set(opts.kinds);
    list = list.filter((e) => s.has(e.kind));
  }
  if (opts?.animeId != null) {
    list = list.filter((e) => e.animeId === opts.animeId);
  }
  return list;
}

export function sessionEvents(): BehaviourEvent[] {
  return readBehaviourEvents({ sinceMs: 2 * 60 * 60 * 1000 });
}

export function recentEvents(days: number): BehaviourEvent[] {
  return readBehaviourEvents({ sinceMs: days * 24 * 60 * 60 * 1000 });
}

export function affinityForAnime(animeId: number): number {
  const evs = readBehaviourEvents({ animeId });
  let score = 0;
  for (const e of evs) {
    const ageDays =
      (Date.now() - new Date(e.at).getTime()) / (24 * 60 * 60 * 1000);
    const decay = Math.exp(-ageDays / 45);
    score += e.weight * decay;
  }
  return score;
}
