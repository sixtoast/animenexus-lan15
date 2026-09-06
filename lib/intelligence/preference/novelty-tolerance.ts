/**
 * Dynamic novelty tolerance from behaviour (not a fixed exploration ratio).
 * Low evidence → neutral 0.5 with low confidence.
 */

import type { WatchlistEntry } from "@/lib/types";
import { recentEvents } from "@/lib/behaviour-events";

export const NOVELTY_TOLERANCE_VERSION = "novelty_v1";

export type NoveltyTolerance = {
  value: number;
  confidence: number;
  evidenceCount: number;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function inferNoveltyTolerance(
  entries: WatchlistEntry[],
  opts?: { eventWindowDays?: number },
): NoveltyTolerance {
  const windowDays = opts?.eventWindowDays ?? 90;
  let evidence = 0;
  let score = 0.5;

  const completed = entries.filter((e) => e.watchStatus === "completed");
  const dropped = entries.filter((e) => e.watchStatus === "dropped");
  const planning = entries.filter((e) => e.watchStatus === "planning");

  const scores = completed
    .map((e) => e.score)
    .filter((s): s is number => typeof s === "number" && s > 0);
  if (scores.length >= 3) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 82) score -= 0.08;
    else if (avg < 70) score += 0.1;
    evidence += Math.min(6, scores.length);
  }

  for (const e of completed) {
    const eps =
      typeof e.episodes === "number"
        ? e.episodes
        : parseInt(String(e.episodes || ""), 10);
    if (Number.isFinite(eps) && eps > 40) {
      score += 0.03;
      evidence += 0.5;
    }
  }

  for (const e of dropped) {
    const sc = e.score;
    if (typeof sc === "number" && sc > 0 && sc < 72) {
      score -= 0.04;
      evidence += 0.8;
    }
  }

  if (planning.length >= 5) {
    score += 0.05;
    evidence += 2;
  }

  try {
    const events = recentEvents(windowDays);
    const cut = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    let opens = 0;
    let searchy = 0;
    for (const ev of events) {
      const ts = new Date(ev.at).getTime();
      if (!Number.isFinite(ts) || ts < cut) continue;
      if (ev.kind === "detail_open" || ev.kind === "detail_revisit") opens++;
      if (ev.kind === "search" || ev.kind === "filter") searchy++;
      if (
        ev.kind === "start" &&
        (ev.meta?.shelf === "exploration" || ev.source === "exploration")
      ) {
        score += 0.06;
        evidence += 1;
      }
      if (ev.kind === "watchlist_remove") {
        score -= 0.03;
        evidence += 0.5;
      }
    }
    if (opens >= 15) {
      score += 0.04;
      evidence += 2;
    }
    if (searchy >= 8) {
      score += 0.05;
      evidence += 2;
    }
  } catch {
    /* events unavailable */
  }

  if (evidence < 3) {
    return { value: 0.5, confidence: 0.2, evidenceCount: Math.round(evidence) };
  }

  const confidence = Math.min(0.88, 0.25 + evidence * 0.06);
  return {
    value: clamp01(score),
    confidence,
    evidenceCount: Math.round(evidence * 10) / 10,
  };
}

export function explorationBudget(n: NoveltyTolerance): {
  safe: number;
  adjacent: number;
  exploratory: number;
} {
  const v = n.value;
  if (v < 0.35) return { safe: 0.85, adjacent: 0.12, exploratory: 0.03 };
  if (v < 0.55) return { safe: 0.75, adjacent: 0.18, exploratory: 0.07 };
  if (v < 0.7) return { safe: 0.65, adjacent: 0.22, exploratory: 0.13 };
  return { safe: 0.55, adjacent: 0.25, exploratory: 0.2 };
}
