/**
 * Implicit behaviour store (Recommendation Engine V2).
 * Not observing ≠ dislike. Exposure is tracked separately from engagement.
 */

const KEY = "anime_nexus_behaviour_v1";
const MAX = 400;

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
  meta?: {
    visibleMs?: number;
    position?: number;
    query?: string;
    filter?: string;
    progress?: number;
    reason?: string;
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
  opts?: { animeId?: number; meta?: BehaviourEvent["meta"]; weight?: number },
): void {
  if (typeof window === "undefined") return;
  const weight = opts?.weight ?? KIND_WEIGHT[kind];
  const ev: BehaviourEvent = {
    id: uid(),
    at: new Date().toISOString(),
    kind,
    animeId: opts?.animeId,
    weight,
    meta: opts?.meta,
  };
  writeAll([ev, ...readAll()]);
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
