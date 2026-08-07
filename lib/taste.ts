import type { WatchStatus, WatchlistEntry } from "./types";

export type TasteStats = {
  total: number;
  byStatus: Record<WatchStatus, number>;
  episodesLogged: number;
  hoursLogged: number;
  hoursCompletedEstimate: number;
  avgCommunityScore: number | null;
  avgUserRating: number | null;
  ratedCount: number;
  byFormat: { format: string; count: number }[];
  byDecade: { decade: string; count: number }[];
  topRated: WatchlistEntry[];
  recentlyUpdated: WatchlistEntry[];
  completionRate: number;
};

const EMPTY_STATUS: Record<WatchStatus, number> = {
  watching: 0,
  planning: 0,
  completed: 0,
  paused: 0,
  dropped: 0,
};

function episodeCount(e: WatchlistEntry): number | null {
  if (typeof e.episodes === "number" && e.episodes > 0) return e.episodes;
  return null;
}

export function computeTaste(entries: WatchlistEntry[]): TasteStats {
  const byStatus = { ...EMPTY_STATUS };
  const formatMap = new Map<string, number>();
  const decadeMap = new Map<string, number>();

  let episodesLogged = 0;
  let minutesLogged = 0;
  let minutesCompleted = 0;
  let scoreSum = 0;
  let scoreN = 0;
  let userSum = 0;
  let userN = 0;

  for (const e of entries) {
    byStatus[e.watchStatus] = (byStatus[e.watchStatus] || 0) + 1;

    const fmt = e.format || "Unknown";
    formatMap.set(fmt, (formatMap.get(fmt) || 0) + 1);

    const y =
      typeof e.year === "number"
        ? e.year
        : typeof e.year === "string" && /^\d{4}/.test(e.year)
          ? parseInt(e.year, 10)
          : null;
    if (y && y > 1900) {
      const decade = `${Math.floor(y / 10) * 10}s`;
      decadeMap.set(decade, (decadeMap.get(decade) || 0) + 1);
    }

    const dur = e.duration && e.duration > 0 ? e.duration : 24;
    const prog = Math.max(0, e.progress || 0);
    episodesLogged += prog;
    minutesLogged += prog * dur;

    if (e.watchStatus === "completed") {
      const eps = episodeCount(e) ?? prog;
      minutesCompleted += Math.max(eps, prog) * dur;
    }

    if (e.score && e.score > 0) {
      scoreSum += e.score;
      scoreN++;
    }
    if (e.userRating && e.userRating > 0) {
      userSum += e.userRating;
      userN++;
    }
  }

  const byFormat = [...formatMap.entries()]
    .map(([format, count]) => ({ format, count }))
    .sort((a, b) => b.count - a.count);

  const byDecade = [...decadeMap.entries()]
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade.localeCompare(b.decade));

  const topRated = entries
    .filter((e) => e.userRating > 0)
    .sort(
      (a, b) =>
        b.userRating - a.userRating || (b.score || 0) - (a.score || 0),
    )
    .slice(0, 8);

  const recentlyUpdated = [...entries]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 8);

  const started =
    byStatus.watching +
    byStatus.completed +
    byStatus.paused +
    byStatus.dropped;
  const completionRate = started > 0 ? byStatus.completed / started : 0;

  return {
    total: entries.length,
    byStatus,
    episodesLogged,
    hoursLogged: Math.round((minutesLogged / 60) * 10) / 10,
    hoursCompletedEstimate: Math.round((minutesCompleted / 60) * 10) / 10,
    avgCommunityScore: scoreN ? Math.round((scoreSum / scoreN) * 10) / 10 : null,
    avgUserRating: userN ? Math.round((userSum / userN) * 10) / 10 : null,
    ratedCount: userN,
    byFormat,
    byDecade,
    topRated,
    recentlyUpdated,
    completionRate,
  };
}

export function statusLabel(s: WatchStatus): string {
  const map: Record<WatchStatus, string> = {
    watching: "Watching",
    planning: "Planning",
    completed: "Completed",
    paused: "Paused",
    dropped: "Dropped",
  };
  return map[s] || s;
}

export {
  getUserGenreWeights,
  genreHeatmap,
  buildTasteDNA,
  parseTasteDNA,
  compareSoulmates,
  computeBadges,
} from "./taste-dna";
export type { TasteDNA, Badge } from "./taste-dna";
