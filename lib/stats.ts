import type { WatchlistEntry } from "./types";

export function computeWatchlistStats(entries: WatchlistEntry[]) {
  const byStatus: Record<string, number> = {
    watching: 0,
    planning: 0,
    completed: 0,
    paused: 0,
    dropped: 0,
  };
  let hours = 0;
  let rated = 0;
  let ratingSum = 0;
  const scoreBuckets: Record<string, number> = {
    "1-3": 0,
    "4-5": 0,
    "6-7": 0,
    "8-9": 0,
    "10": 0,
  };
  const genreCounts: Record<string, number> = {};

  for (const e of entries) {
    byStatus[e.watchStatus] = (byStatus[e.watchStatus] || 0) + 1;
    const dur = e.duration && e.duration > 0 ? e.duration : 24;
    const eps =
      e.watchStatus === "completed"
        ? Number(e.episodes) || e.progress || 0
        : e.progress || 0;
    hours += (Math.max(0, eps) * dur) / 60;
    if (e.userRating > 0) {
      rated += 1;
      ratingSum += e.userRating;
      if (e.userRating <= 3) scoreBuckets["1-3"]++;
      else if (e.userRating <= 5) scoreBuckets["4-5"]++;
      else if (e.userRating <= 7) scoreBuckets["6-7"]++;
      else if (e.userRating <= 9) scoreBuckets["8-9"]++;
      else scoreBuckets["10"]++;
    }
    for (const g of e.genres || e.tags || []) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    total: entries.length,
    byStatus,
    hours: Math.round(hours * 10) / 10,
    meanRating: rated ? ratingSum / rated : 0,
    rated,
    scoreBuckets,
    topGenres,
  };
}
