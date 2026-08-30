/**
 * Living watchlist queue: next-up, stale planning, resume, why-next.
 */

import type { WatchlistEntry } from "./types";
import { buildPreferenceProfile, scoreCandidate } from "./preference-engine";
import type { Anime } from "./types";

export type QueueItem = {
  entry: WatchlistEntry;
  kind: "resume" | "next_up" | "stale_planning";
  reason: string;
  score: number;
};

function entryAsAnime(e: WatchlistEntry): Anime {
  return {
    id: e.id,
    title: e.title,
    image: e.image,
    score: e.score || 0,
    tags: e.tags || e.genres || [],
    format: e.format || "TV",
    episodes: typeof e.episodes === "number" ? e.episodes : 0,
    duration: e.duration || 24,
    status: "FINISHED",
    year: typeof e.year === "number" ? e.year : 0,
  } as Anime;
}

function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return (Date.now() - t) / (24 * 60 * 60 * 1000);
}

export function buildWatchlistQueue(
  entries: WatchlistEntry[],
  limit = 8,
): QueueItem[] {
  if (!entries.length) return [];
  const profile = buildPreferenceProfile(entries);
  const items: QueueItem[] = [];

  // Resume: watching / paused with progress
  for (const e of entries) {
    if (
      e.watchStatus === "watching" ||
      (e.watchStatus === "paused" && (e.progress || 0) > 0)
    ) {
      const ep =
        typeof e.episodes === "number"
          ? e.episodes
          : parseInt(String(e.episodes || ""), 10) || 0;
      const left = ep > 0 ? Math.max(0, ep - (e.progress || 0)) : null;
      items.push({
        entry: e,
        kind: "resume",
        reason:
          left != null && left > 0
            ? `Resume · ~${left} ep left`
            : `Resume · ep ${e.progress || 0}`,
        score: 10 + (e.progress || 0) * 0.01,
      });
    }
  }

  // Next-up: planning ranked by preference engine
  const planning = entries.filter((e) => e.watchStatus === "planning");
  for (const e of planning) {
    const signals = scoreCandidate(entryAsAnime(e), profile);
    const stale = daysSince(e.updatedAt || e.addedAt) >= 21;
    items.push({
      entry: e,
      kind: stale ? "stale_planning" : "next_up",
      reason: stale
        ? `Stale plan · ${signals.reasons[0] || "still on the shelf"}`
        : signals.reasons[0] || "Fits your current interest modes",
      score: (stale ? 3 : 6) + signals.score,
    });
  }

  items.sort((a, b) => b.score - a.score);

  // Prefer one resume first if any
  const resume = items.filter((i) => i.kind === "resume");
  const rest = items.filter((i) => i.kind !== "resume");
  return [...resume, ...rest].slice(0, limit);
}
