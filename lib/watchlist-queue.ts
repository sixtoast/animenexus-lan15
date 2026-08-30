/**
 * Living watchlist queue: next-up, stale planning, resume, why-next.
 */

import type { Anime, WatchlistEntry } from "./types";
import { buildPreferenceProfile, scoreCandidate } from "./preference-engine";

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
    description: "",
    genre: (e.genres || e.tags || [])[0] || "",
    tags: e.tags || e.genres || [],
    status: "FINISHED",
    format: (e.format as Anime["format"]) || "TV",
    year: e.year || 0,
    score: e.score || 0,
    popularity: 0,
    image: e.image,
    anilist_id: e.id,
    episodes: typeof e.episodes === "number" ? e.episodes : 0,
    duration: e.duration || 24,
    studios: e.studios,
  };
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
  const resume = items.filter((i) => i.kind === "resume");
  const rest = items.filter((i) => i.kind !== "resume");
  return [...resume, ...rest].slice(0, limit);
}
