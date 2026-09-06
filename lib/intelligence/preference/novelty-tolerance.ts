/**
 * Dynamic novelty tolerance from behaviour + taste-distance outcomes.
 * High-distance completions raise tolerance; only-safe accepts lower it.
 */

import type { WatchlistEntry } from "@/lib/types";
import { recentEvents } from "@/lib/behaviour-events";
import { buildAnimePreferenceFingerprint } from "@/lib/intelligence/items";
import {
  vectorSimilarity,
  WEIGHTS_LONG_TERM,
} from "@/lib/intelligence/items/fingerprint-similarity";
import {
  blendUserVector,
  buildUserPreferenceVector,
} from "./user-preference-vector";

export const NOVELTY_TOLERANCE_VERSION = "novelty_v2";

export type NoveltyTolerance = {
  value: number;
  confidence: number;
  evidenceCount: number;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function episodeCount(e: WatchlistEntry): number {
  const n =
    typeof e.episodes === "number"
      ? e.episodes
      : parseInt(String(e.episodes || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function tasteDistance(
  entry: WatchlistEntry,
  others: WatchlistEntry[],
): number | null {
  if (others.length < 2) return null;
  try {
    const user = buildUserPreferenceVector(others, { autoSession: false });
    const vec = blendUserVector(user, {
      stable: 0.7,
      mediumTerm: 0.2,
      recent: 0.1,
      session: 0,
    });
    const fp = buildAnimePreferenceFingerprint({
      id: entry.id,
      title: entry.title,
      description: "",
      genre: (entry.genres || entry.tags || [])[0] || "",
      tags: entry.genres || entry.tags || [],
      status: "FINISHED",
      format: (entry.format as never) || "TV",
      year: entry.year || "",
      score: entry.score || 0,
      popularity: 0,
      image: entry.image,
      anilist_id: entry.id,
      episodes: entry.episodes ?? "",
      duration: entry.duration || 24,
    });
    const sim = vectorSimilarity(vec, fp, WEIGHTS_LONG_TERM);
    return clamp01(1 - sim);
  } catch {
    return null;
  }
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

  for (const e of completed) {
    const eps = episodeCount(e);
    if (eps > 40) {
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

  let farComplete = 0;
  let nearComplete = 0;
  let farDrop = 0;
  for (const e of completed.slice(-12)) {
    const others = entries.filter((x) => x.id !== e.id);
    const d = tasteDistance(e, others);
    if (d == null) continue;
    evidence += 1.2;
    if (d >= 0.42) {
      farComplete++;
      score += 0.07;
    } else if (d <= 0.22) {
      nearComplete++;
      score -= 0.02;
    }
  }
  for (const e of dropped.slice(-8)) {
    const others = entries.filter((x) => x.id !== e.id);
    const d = tasteDistance(e, others);
    if (d == null) continue;
    evidence += 0.8;
    if (d >= 0.4) {
      farDrop++;
      score -= 0.06;
    }
  }
  if (farComplete >= 2 && farDrop === 0) {
    score += 0.05;
    evidence += 1;
  }
  if (nearComplete >= 5 && farComplete === 0) {
    score -= 0.06;
    evidence += 1.5;
  }

  try {
    const events = recentEvents(windowDays);
    const cut = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    let opens = 0;
    let searchy = 0;
    let exploratoryStarts = 0;
    let safeAccepts = 0;
    let farAccepts = 0;

    for (const ev of events) {
      const ts = new Date(ev.at).getTime();
      if (!Number.isFinite(ts) || ts < cut) continue;
      if (ev.kind === "detail_open" || ev.kind === "detail_revisit") opens++;
      if (ev.kind === "search" || ev.kind === "filter") searchy++;
      if (
        ev.kind === "start" &&
        (ev.meta?.shelf === "exploration" || ev.source === "exploration")
      ) {
        exploratoryStarts++;
        score += 0.05;
        evidence += 1;
      }
      if (ev.kind === "rec_accept" || ev.kind === "rec_open") {
        const src = (ev.source || ev.meta?.shelf || "").toLowerCase();
        if (
          src.includes("explor") ||
          src.includes("blind") ||
          src.includes("fingerprint_nn")
        ) {
          farAccepts++;
          score += 0.04;
          evidence += 0.8;
        } else if (src.includes("stable") || src.includes("safe")) {
          safeAccepts++;
        }
      }
      if (ev.kind === "watchlist_remove") {
        score -= 0.03;
        evidence += 0.5;
      }
    }

    if (opens >= 15) {
      score += 0.02;
      evidence += 1;
    }
    if (searchy >= 8) {
      score += 0.02;
      evidence += 1;
    }
    if (farAccepts >= 3 && safeAccepts <= farAccepts) {
      score += 0.05;
      evidence += 1.5;
    }
    if (safeAccepts >= 6 && farAccepts === 0 && exploratoryStarts === 0) {
      score -= 0.05;
      evidence += 1.5;
    }
  } catch {
    /* events unavailable */
  }

  if (evidence < 3) {
    return {
      value: 0.5,
      confidence: 0.2,
      evidenceCount: Math.round(evidence),
    };
  }

  const confidence = Math.min(0.88, 0.25 + evidence * 0.05);
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
  if (v < 0.7) return { safe: 0.55, adjacent: 0.28, exploratory: 0.17 };
  return { safe: 0.4, adjacent: 0.32, exploratory: 0.28 };
}
