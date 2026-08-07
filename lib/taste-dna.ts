import type { WatchlistEntry } from "./types";

export function getUserGenreWeights(
  entries: WatchlistEntry[],
): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const e of entries) {
    const genres = e.genres?.length ? e.genres : [];
    const mult =
      e.watchStatus === "completed"
        ? 1.2
        : e.watchStatus === "watching"
          ? 1.1
          : e.watchStatus === "dropped"
            ? 0.4
            : 0.8;
    const ratingBoost = e.userRating > 0 ? 0.5 + e.userRating / 20 : 1;
    for (const g of genres) {
      if (!g) continue;
      weights[g] = (weights[g] || 0) + mult * ratingBoost;
    }
  }
  return weights;
}

export function genreHeatmap(
  entries: WatchlistEntry[],
): { genre: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    for (const g of e.genres || []) {
      map.set(g, (map.get(g) || 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

export type TasteDNA = {
  v: 1;
  g: [string, number][];
  n: number;
  c: number;
};

export function buildTasteDNA(entries: WatchlistEntry[]): string {
  const weights = getUserGenreWeights(entries);
  const topGenres = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([g, w]) => [g, Math.round(w * 10) / 10] as [string, number]);
  const completed = entries.filter((e) => e.watchStatus === "completed").length;
  const payload: TasteDNA = {
    v: 1,
    g: topGenres,
    n: entries.length,
    c: completed,
  };
  return `ANX1.${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
}

export function parseTasteDNA(code: string): TasteDNA | null {
  try {
    const raw = code.trim();
    const body = raw.startsWith("ANX1.") ? raw.slice(5) : raw;
    const json = decodeURIComponent(escape(atob(body)));
    const parsed = JSON.parse(json) as TasteDNA;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.g)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function compareSoulmates(
  entries: WatchlistEntry[],
  other: TasteDNA,
): { pct: number; shared: string[]; sharedTitles: string[] } {
  const myWeights = getUserGenreWeights(entries);
  const myTop = new Map(
    Object.entries(myWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
  );
  const otherTop = new Map(other.g || []);
  const allGenres = new Set([...myTop.keys(), ...otherTop.keys()]);
  if (allGenres.size === 0) {
    return { pct: 0, shared: [], sharedTitles: [] };
  }
  let score = 0;
  let max = 0;
  const shared: string[] = [];
  for (const g of allGenres) {
    const a = myTop.get(g) || 0;
    const b = otherTop.get(g) || 0;
    score += Math.min(a, b);
    max += Math.max(a, b);
    if (a > 0 && b > 0) shared.push(g);
  }
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return { pct, shared, sharedTitles: [] };
}

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  unlocked: boolean;
  hint: string;
};

export function computeBadges(entries: WatchlistEntry[]): Badge[] {
  const n = entries.length;
  const completed = entries.filter((e) => e.watchStatus === "completed").length;
  const watching = entries.filter((e) => e.watchStatus === "watching").length;
  const genres = new Set(entries.flatMap((e) => e.genres || []));
  const hours =
    entries.reduce((sum, e) => {
      const dur = e.duration && e.duration > 0 ? e.duration : 24;
      return sum + Math.max(0, e.progress || 0) * dur;
    }, 0) / 60;
  const rated = entries.filter((e) => e.userRating > 0).length;

  return [
    {
      id: "first",
      label: "Signal locked",
      emoji: "📡",
      unlocked: n >= 1,
      hint: "Add your first title",
    },
    {
      id: "ten",
      label: "Queue builder",
      emoji: "📚",
      unlocked: n >= 10,
      hint: "10 titles on the list",
    },
    {
      id: "fifty",
      label: "Archive mind",
      emoji: "🗄️",
      unlocked: n >= 50,
      hint: "50 titles tracked",
    },
    {
      id: "finisher",
      label: "Closer",
      emoji: "✅",
      unlocked: completed >= 5,
      hint: "Complete 5 titles",
    },
    {
      id: "multitask",
      label: "Parallel arcs",
      emoji: "🔀",
      unlocked: watching >= 3,
      hint: "Watching 3 at once",
    },
    {
      id: "palette",
      label: "Wide band",
      emoji: "🎨",
      unlocked: genres.size >= 8,
      hint: "8+ distinct genres",
    },
    {
      id: "hours",
      label: "Night shift",
      emoji: "⏱️",
      unlocked: hours >= 24,
      hint: "24+ hours logged",
    },
    {
      id: "critic",
      label: "Calibrated",
      emoji: "⭐",
      unlocked: rated >= 5,
      hint: "Rate 5 titles",
    },
  ];
}
