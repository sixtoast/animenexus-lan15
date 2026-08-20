/**
 * Lantern Insights (Sprint 27).
 * Observations from aggregated memory + shelf — never invented.
 * Each insight: text, evidence, confidence, dismissible id.
 */

import {
  getGenrePreferences,
  readMemory,
  type LanternMemory,
} from "./lantern-memory";
import type { WatchlistEntry } from "./types";

const DISMISS_KEY = "anime_nexus_insight_dismiss_v1";

export type LanternInsight = {
  id: string;
  text: string;
  evidence: string[];
  /** 0–1 coarse confidence */
  confidence: number;
  confidenceLabel: "strong" | "moderate" | "soft";
};

function confidenceLabel(c: number): LanternInsight["confidenceLabel"] {
  if (c >= 0.7) return "strong";
  if (c >= 0.45) return "moderate";
  return "soft";
}

export function readDismissedInsights(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const j = JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
    return new Set(Array.isArray(j) ? j.map(String) : []);
  } catch {
    return new Set();
  }
}

export function dismissInsight(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = readDismissedInsights();
    set.add(id);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...set].slice(-40)));
  } catch {
    /* */
  }
}

function avgEpisodes(entries: WatchlistEntry[]): number | null {
  const nums = entries
    .map((e) => {
      const n =
        typeof e.episodes === "number"
          ? e.episodes
          : parseInt(String(e.episodes || ""), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    })
    .filter((n): n is number => n != null);
  if (nums.length < 3) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function shortEpisodeFinishBias(entries: WatchlistEntry[]): LanternInsight | null {
  const completed = entries.filter((e) => e.watchStatus === "completed");
  if (completed.length < 3) return null;
  const short = completed.filter((e) => {
    const n =
      typeof e.episodes === "number"
        ? e.episodes
        : parseInt(String(e.episodes || ""), 10);
    return Number.isFinite(n) && n > 0 && n <= 13;
  });
  const ratio = short.length / completed.length;
  if (ratio < 0.55) return null;
  const conf = Math.min(0.9, 0.4 + ratio * 0.4);
  return {
    id: "finish-short-series",
    text: `You tend to close shorter runs — ${short.length} of ${completed.length} completed titles are ≤13 episodes.`,
    evidence: [
      `${completed.length} completed on shelf`,
      `${short.length} of those have ≤13 episodes`,
      `Share: ${Math.round(ratio * 100)}%`,
    ],
    confidence: conf,
    confidenceLabel: confidenceLabel(conf),
  };
}

function genreDominance(
  entries: WatchlistEntry[],
  m: LanternMemory,
): LanternInsight | null {
  const prefs = getGenrePreferences(m);
  const top = prefs[0];
  if (!top || top.evidenceCount < 3 || top.confidence < 0.35) return null;
  const conf = top.confidence;
  return {
    id: `genre-dom-${top.value.toLowerCase().replace(/\s+/g, "-")}`,
    text: `Your shelf keeps returning to ${top.value}.`,
    evidence: [
      `Preference score ${top.score.toFixed(2)} with confidence ${top.confidence.toFixed(2)}`,
      `${top.evidenceCount} evidence signals in local memory`,
      entries.filter((e) => (e.genres || []).includes(top.value)).length
        ? `${entries.filter((e) => (e.genres || []).includes(top.value)).length} shelf titles tagged ${top.value}`
        : "Drawn from browse/view signals as well as seals",
    ],
    confidence: conf,
    confidenceLabel: confidenceLabel(conf),
  };
}

function recLearning(m: LanternMemory): LanternInsight | null {
  const s = m.recStats;
  if (!s || s.shown < 5) return null;
  const acceptRate = s.accepted / Math.max(1, s.shown);
  const rejectRate = s.rejected / Math.max(1, s.shown);
  if (acceptRate >= 0.25) {
    const conf = Math.min(0.85, 0.35 + acceptRate);
    return {
      id: "rec-accept-rate",
      text: `You’ve sealed ${s.accepted} of ${s.shown} recommendations Lantern showed.`,
      evidence: [
        `Shown ${s.shown} · opened ${s.opened} · accepted ${s.accepted} · rejected ${s.rejected}`,
        `Accept rate ~${Math.round(acceptRate * 100)}%`,
      ],
      confidence: conf,
      confidenceLabel: confidenceLabel(conf),
    };
  }
  if (rejectRate >= 0.3 && s.rejected >= 3) {
    const conf = Math.min(0.8, 0.35 + rejectRate);
    return {
      id: "rec-reject-rate",
      text: `You’re teaching the desk — ${s.rejected} recommendations marked less like this.`,
      evidence: [
        `Rejected ${s.rejected} of ${s.shown} shown`,
        "Those ids stay out of For you until you clear feedback",
      ],
      confidence: conf,
      confidenceLabel: confidenceLabel(conf),
    };
  }
  return null;
}

function backlogPressure(entries: WatchlistEntry[]): LanternInsight | null {
  const planning = entries.filter((e) => e.watchStatus === "planning");
  const watching = entries.filter((e) => e.watchStatus === "watching");
  if (planning.length < 5) return null;
  const conf = Math.min(0.85, 0.3 + planning.length * 0.04);
  return {
    id: "backlog-pressure",
    text: `Your planning shelf has ${planning.length} titles${watching.length ? ` while ${watching.length} are still in progress` : ""}.`,
    evidence: [
      `${planning.length} planning`,
      watching.length ? `${watching.length} watching` : "No active watching",
    ],
    confidence: conf,
    confidenceLabel: confidenceLabel(conf),
  };
}

function visitRhythm(m: LanternMemory): LanternInsight | null {
  if (m.visitDays.length < 4) return null;
  const conf = Math.min(0.8, 0.25 + m.visitDays.length * 0.03);
  return {
    id: "visit-rhythm",
    text: `You’ve opened the desk on ${m.visitDays.length} different days.`,
    evidence: [
      `${m.sessionOpens} session opens logged`,
      m.lastVisitAt
        ? `Last visit ${new Date(m.lastVisitAt).toLocaleDateString()}`
        : "Recent activity recorded",
    ],
    confidence: conf,
    confidenceLabel: confidenceLabel(conf),
  };
}

function avgEpInsight(entries: WatchlistEntry[]): LanternInsight | null {
  const completed = entries.filter((e) => e.watchStatus === "completed");
  const avg = avgEpisodes(completed);
  if (avg == null) return null;
  const conf = Math.min(0.75, 0.3 + completed.length * 0.03);
  return {
    id: "avg-episode-length",
    text: `Completed titles average about ${avg.toFixed(0)} episodes.`,
    evidence: [`${completed.length} completed with episode counts`],
    confidence: conf,
    confidenceLabel: confidenceLabel(conf),
  };
}

/** Generate up to `limit` insights, excluding dismissed ids. */
export function buildLanternInsights(
  entries: WatchlistEntry[],
  opts?: { memory?: LanternMemory; limit?: number },
): LanternInsight[] {
  const m = opts?.memory || readMemory();
  const limit = opts?.limit ?? 4;
  const dismissed = readDismissedInsights();

  const candidates: (LanternInsight | null)[] = [
    genreDominance(entries, m),
    shortEpisodeFinishBias(entries),
    backlogPressure(entries),
    recLearning(m),
    avgEpInsight(entries),
    visitRhythm(m),
  ];

  return candidates
    .filter((x): x is LanternInsight => !!x && !dismissed.has(x.id))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}
