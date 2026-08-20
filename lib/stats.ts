/**
 * Watchlist stats + editorial “year in anime” narrative (Sprint 21).
 * Prefer story beats over graph spam.
 */

import type { WatchlistEntry } from "./types";

export function computeWatchlistStats(entries: WatchlistEntry[]) {
  const byStatus: Record<string, number> = {
    watching: 0,
    planning: 0,
    paused: 0,
    completed: 0,
    dropped: 0,
  };
  let hours = 0;
  let episodes = 0;
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
    const epN = Math.max(0, Number(eps) || 0);
    episodes += epN;
    hours += (epN * dur) / 60;
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

  const started =
    byStatus.watching +
    byStatus.completed +
    byStatus.paused +
    byStatus.dropped;
  const completionRate = started > 0 ? byStatus.completed / started : 0;

  return {
    total: entries.length,
    byStatus,
    hours: Math.round(hours * 10) / 10,
    episodes,
    meanRating: rated ? ratingSum / rated : 0,
    rated,
    scoreBuckets,
    topGenres,
    completionRate,
  };
}

export type EditorialBeat = {
  id: string;
  label: string;
  value: string;
  detail?: string;
};

export type EditorialReport = {
  yearLabel: string;
  headline: string;
  beats: EditorialBeat[];
  longest?: { title: string; id: number; episodes: number } | null;
  surprise?: { title: string; id: number; reason: string } | null;
  peak?: { title: string; id: number; rating: number } | null;
};

/**
 * “Your year in anime” — editorial, not a dashboard dump.
 */
export function buildEditorialReport(
  entries: WatchlistEntry[],
): EditorialReport {
  const s = computeWatchlistStats(entries);
  const year = new Date().getFullYear();
  const yearLabel = `${year}`;

  let longest: EditorialReport["longest"] = null;
  for (const e of entries) {
    const eps =
      e.watchStatus === "completed"
        ? Number(e.episodes) || e.progress || 0
        : e.progress || 0;
    const n = Math.max(0, Number(eps) || 0);
    if (!longest || n > longest.episodes) {
      longest = { title: e.title, id: e.id, episodes: n };
    }
  }
  if (longest && longest.episodes < 2) longest = null;

  const peakRated = [...entries]
    .filter((e) => e.userRating > 0)
    .sort((a, b) => b.userRating - a.userRating)[0];
  const peak = peakRated
    ? {
        title: peakRated.title,
        id: peakRated.id,
        rating: peakRated.userRating,
      }
    : null;

  // Surprise: high user rating with lower community score, or recent completion
  let surprise: EditorialReport["surprise"] = null;
  const surprises = entries
    .filter(
      (e) =>
        e.userRating >= 8 &&
        typeof e.score === "number" &&
        e.score > 0 &&
        e.score < 7.2,
    )
    .sort((a, b) => b.userRating - a.userRating);
  if (surprises[0]) {
    surprise = {
      title: surprises[0].title,
      id: surprises[0].id,
      reason: `You scored it ${surprises[0].userRating} while community sits near ${surprises[0].score?.toFixed?.(1) ?? surprises[0].score}`,
    };
  } else {
    const recentDone = entries
      .filter((e) => e.watchStatus === "completed")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
    if (recentDone) {
      surprise = {
        title: recentDone.title,
        id: recentDone.id,
        reason: "Most recently closed on your shelf",
      };
    }
  }

  const topGenre = s.topGenres[0]?.[0];
  const beats: EditorialBeat[] = [
    {
      id: "stories",
      label: "Stories on the shelf",
      value: String(s.total),
      detail: `${s.byStatus.completed} completed · ${s.byStatus.watching} watching`,
    },
    {
      id: "episodes",
      label: "Episodes tracked",
      value: String(s.episodes),
      detail: "Progress + full counts for completed titles",
    },
    {
      id: "hours",
      label: "Estimated watch time",
      value: `${s.hours}h`,
      detail: "Uses episode length when known (else 24 min)",
    },
    {
      id: "completion",
      label: "Completion rate",
      value: `${Math.round(s.completionRate * 100)}%`,
      detail:
        s.completionRate >= 0.5
          ? "You tend to finish what you start"
          : "You explore more than you close — valid frequency",
    },
  ];

  if (topGenre) {
    beats.push({
      id: "genre",
      label: "Favourite genre signal",
      value: topGenre,
      detail: `${s.topGenres[0][1]} titles touch this band`,
    });
  }

  if (s.meanRating > 0) {
    beats.push({
      id: "score",
      label: "Mean of your scores",
      value: s.meanRating.toFixed(1),
      detail: `Across ${s.rated} rated titles`,
    });
  }

  const headline =
    s.total === 0
      ? "No year on record yet."
      : s.total < 8
        ? `A quiet ${year} so far — the desk is still learning your shape.`
        : topGenre
          ? `${year} leans ${topGenre}: ${s.hours} hours across ${s.total} stories.`
          : `${year}: ${s.total} stories and ${s.hours} hours on the dial.`;

  return {
    yearLabel,
    headline,
    beats,
    longest,
    surprise,
    peak,
  };
}
