/**
 * Recommendation lifecycle feedback (Sprint 4).
 * Local only — pairs with Nexus events + lantern-memory recStats.
 */

import { emitNexus } from "./nexus";

const KEY = "anime_nexus_rec_feedback_v1";
const MAX = 80;

export type RejectReason =
  | "not_interested"
  | "too_long"
  | "too_dark"
  | "wrong_genre"
  | "already_seen"
  | "already_tried"
  | "not_now";

export type RecFeedbackEntry = {
  animeId: number;
  at: string;
  kind: "shown" | "opened" | "accepted" | "rejected";
  reason?: RejectReason;
};

function readAll(): RecFeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

function writeAll(list: RecFeedbackEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* quota */
  }
}

function push(entry: RecFeedbackEntry) {
  const next = [entry, ...readAll().filter((e) => !(e.animeId === entry.animeId && e.kind === entry.kind))];
  writeAll(next);
}

export function markRecShown(animeId: number) {
  push({ animeId, at: new Date().toISOString(), kind: "shown" });
  emitNexus({ type: "recommendation_shown", animeId });
}

export function markRecOpened(animeId: number) {
  push({ animeId, at: new Date().toISOString(), kind: "opened" });
  emitNexus({ type: "recommendation_opened", animeId });
}

export function markRecAccepted(animeId: number) {
  push({ animeId, at: new Date().toISOString(), kind: "accepted" });
  emitNexus({ type: "recommendation_accepted", animeId });
}

export function markRecRejected(animeId: number, reason?: RejectReason) {
  push({
    animeId,
    at: new Date().toISOString(),
    kind: "rejected",
    reason,
  });
  emitNexus({
    type: "recommendation_rejected",
    animeId,
    reason,
  });
}

/** Ids the user explicitly rejected (for exclusion). */
export function rejectedAnimeIds(): number[] {
  return [
    ...new Set(
      readAll()
        .filter((e) => e.kind === "rejected")
        .map((e) => e.animeId),
    ),
  ];
}

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  not_interested: "Not interested",
  too_long: "Too long",
  too_dark: "Too dark",
  wrong_genre: "Wrong genre",
  already_seen: "Already seen",
  already_tried: "Already tried",
  not_now: "Not now",
};
