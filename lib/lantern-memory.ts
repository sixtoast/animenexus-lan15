/**
 * Lantern Memory — local persistent memory for the host persona.
 * v2 adds preference confidence, rec/watchlist signal counters, search log.
 * Browser-only; never blocks rendering if storage fails.
 *
 * Privacy: stays on-device. AI digests are minimum context only.
 */

const KEY = "anime_nexus_lantern_memory_v1";
const MAX_RECENT = 24;
const MAX_COMPLETED = 40;
const MAX_SEARCHES = 24;
const MAX_FILTERS = 24;
const MAX_TOOLS = 20;

export type RecentView = {
  id: number;
  title: string;
  image?: string;
  at: string;
};

export type CompletedLog = {
  id: number;
  title: string;
  at: string;
};

/** Inferred preference with confidence (Sprint 2). */
export type PreferenceSignal = {
  value: string;
  /** Soft score 0–1 after decay. */
  score: number;
  /** 0–1; evidence-based. */
  confidence: number;
  evidenceCount: number;
  lastUpdated: string;
};

export type RecommendationStats = {
  shown: number;
  opened: number;
  accepted: number;
  rejected: number;
};

export type WatchlistSignalStats = {
  added: number;
  removed: number;
  started: number;
  dropped: number;
};

export type LanternMemory = {
  /** 1 = legacy shape; 2 = extended fields present */
  version: 1 | 2;
  recentViews: RecentView[];
  completedLog: CompletedLog[];
  genreCounts: Record<string, number>;
  studioCounts: Record<string, number>;
  visitDays: string[];
  lastVisitAt: string | null;
  sessionOpens: number;
  firstSeenAt: string | null;
  /** v2 */
  genrePrefs?: PreferenceSignal[];
  studioPrefs?: PreferenceSignal[];
  recStats?: RecommendationStats;
  watchlistSignals?: WatchlistSignalStats;
  recentSearches?: { q: string; at: string }[];
  recentFilters?: { filter: string; at: string }[];
  recentTools?: { tool: string; at: string }[];
};

function emptyRecStats(): RecommendationStats {
  return { shown: 0, opened: 0, accepted: 0, rejected: 0 };
}

function emptyWatchSignals(): WatchlistSignalStats {
  return { added: 0, removed: 0, started: 0, dropped: 0 };
}

function empty(): LanternMemory {
  return {
    version: 2,
    recentViews: [],
    completedLog: [],
    genreCounts: {},
    studioCounts: {},
    visitDays: [],
    lastVisitAt: null,
    sessionOpens: 0,
    firstSeenAt: null,
    genrePrefs: [],
    studioPrefs: [],
    recStats: emptyRecStats(),
    watchlistSignals: emptyWatchSignals(),
    recentSearches: [],
    recentFilters: [],
    recentTools: [],
  };
}

function migrate(raw: Partial<LanternMemory>): LanternMemory {
  const base = empty();
  return {
    ...base,
    ...raw,
    version: 2,
    recentViews: Array.isArray(raw.recentViews) ? raw.recentViews : [],
    completedLog: Array.isArray(raw.completedLog) ? raw.completedLog : [],
    genreCounts: raw.genreCounts || {},
    studioCounts: raw.studioCounts || {},
    visitDays: Array.isArray(raw.visitDays) ? raw.visitDays : [],
    genrePrefs: Array.isArray(raw.genrePrefs) ? raw.genrePrefs : [],
    studioPrefs: Array.isArray(raw.studioPrefs) ? raw.studioPrefs : [],
    recStats: { ...emptyRecStats(), ...(raw.recStats || {}) },
    watchlistSignals: {
      ...emptyWatchSignals(),
      ...(raw.watchlistSignals || {}),
    },
    recentSearches: Array.isArray(raw.recentSearches) ? raw.recentSearches : [],
    recentFilters: Array.isArray(raw.recentFilters) ? raw.recentFilters : [],
    recentTools: Array.isArray(raw.recentTools) ? raw.recentTools : [],
  };
}

export function readMemory(): LanternMemory {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return migrate(JSON.parse(raw) as Partial<LanternMemory>);
  } catch {
    return empty();
  }
}

export function writeMemory(m: LanternMemory) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...m, version: 2 }));
  } catch {
    /* quota */
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Half-life decay for preference scores (~45 days). */
const PREF_HALF_LIFE_MS = 45 * 24 * 60 * 60 * 1000;

function decayFactor(lastUpdated: string, now = Date.now()): number {
  const t = new Date(lastUpdated).getTime();
  if (!Number.isFinite(t)) return 0.5;
  const age = Math.max(0, now - t);
  return Math.pow(0.5, age / PREF_HALF_LIFE_MS);
}

function confidenceFromEvidence(n: number): number {
  return Math.min(0.95, 1 - Math.exp(-n / 5));
}

function bumpPref(
  list: PreferenceSignal[],
  value: string,
  weight: number,
): PreferenceSignal[] {
  const at = new Date().toISOString();
  const key = value.trim();
  if (!key) return list;
  const existing = list.find((p) => p.value === key);
  if (existing) {
    const decayed = existing.score * decayFactor(existing.lastUpdated);
    const evidenceCount = existing.evidenceCount + 1;
    const score = Math.min(1, decayed + weight * 0.12);
    return list.map((p) =>
      p.value === key
        ? {
            value: key,
            score,
            confidence: confidenceFromEvidence(evidenceCount),
            evidenceCount,
            lastUpdated: at,
          }
        : p,
    );
  }
  return [
    {
      value: key,
      score: Math.min(1, weight * 0.2),
      confidence: confidenceFromEvidence(1),
      evidenceCount: 1,
      lastUpdated: at,
    },
    ...list,
  ].slice(0, 40);
}

export function recomputePrefsFromCounts(m: LanternMemory): LanternMemory {
  const at = new Date().toISOString();
  const fromCounts = (counts: Record<string, number>): PreferenceSignal[] => {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] || 1;
    return entries.slice(0, 24).map(([value, n]) => ({
      value,
      score: Math.min(1, n / max),
      confidence: confidenceFromEvidence(n),
      evidenceCount: n,
      lastUpdated: at,
    }));
  };
  m.genrePrefs = fromCounts(m.genreCounts);
  m.studioPrefs = fromCounts(m.studioCounts);
  return m;
}

export function getGenrePreferences(m?: LanternMemory): PreferenceSignal[] {
  const mem = m || readMemory();
  let prefs = mem.genrePrefs || [];
  if (!prefs.length && Object.keys(mem.genreCounts).length) {
    prefs = recomputePrefsFromCounts({ ...mem }).genrePrefs || [];
  }
  const now = Date.now();
  return prefs
    .map((p) => ({
      ...p,
      score: Math.min(1, p.score * decayFactor(p.lastUpdated, now)),
    }))
    .sort((a, b) => b.score * b.confidence - a.score * a.confidence);
}

export function touchSession() {
  const m = readMemory();
  const now = new Date().toISOString();
  if (!m.firstSeenAt) m.firstSeenAt = now;
  m.lastVisitAt = now;
  m.sessionOpens = (m.sessionOpens || 0) + 1;
  const day = todayKey();
  if (!m.visitDays.includes(day)) {
    m.visitDays = [day, ...m.visitDays].slice(0, 60);
  }
  writeMemory(m);
  return m;
}

export function recordView(input: {
  id: number;
  title: string;
  image?: string;
  genres?: string[];
  studios?: string[];
}) {
  const m = readMemory();
  const at = new Date().toISOString();
  m.recentViews = [
    { id: input.id, title: input.title, image: input.image, at },
    ...m.recentViews.filter((r) => r.id !== input.id),
  ].slice(0, MAX_RECENT);

  for (const g of input.genres || []) {
    const k = g.trim();
    if (!k) continue;
    m.genreCounts[k] = (m.genreCounts[k] || 0) + 1;
    m.genrePrefs = bumpPref(m.genrePrefs || [], k, 1);
  }
  for (const s of input.studios || []) {
    const k = s.trim();
    if (!k) continue;
    m.studioCounts[k] = (m.studioCounts[k] || 0) + 1;
    m.studioPrefs = bumpPref(m.studioPrefs || [], k, 1);
  }
  m.lastVisitAt = at;
  writeMemory(m);
  return m;
}

export function recordCompletion(input: { id: number; title: string }) {
  const m = readMemory();
  const at = new Date().toISOString();
  m.completedLog = [
    { id: input.id, title: input.title, at },
    ...m.completedLog.filter((c) => c.id !== input.id),
  ].slice(0, MAX_COMPLETED);
  m.lastVisitAt = at;
  writeMemory(m);
  return m;
}

export function noteSearchQuery(query: string) {
  const q = query.trim().slice(0, 80);
  if (!q) return;
  const m = readMemory();
  const at = new Date().toISOString();
  m.recentSearches = [
    { q, at },
    ...(m.recentSearches || []).filter((s) => s.q.toLowerCase() !== q.toLowerCase()),
  ].slice(0, MAX_SEARCHES);
  writeMemory(m);
}

export function noteFilterUsed(filter: string) {
  const f = filter.trim().slice(0, 64);
  if (!f) return;
  const m = readMemory();
  const at = new Date().toISOString();
  m.recentFilters = [{ filter: f, at }, ...(m.recentFilters || [])].slice(
    0,
    MAX_FILTERS,
  );
  if (f.startsWith("genre:")) {
    const g = f.slice(6);
    m.genreCounts[g] = (m.genreCounts[g] || 0) + 1;
    m.genrePrefs = bumpPref(m.genrePrefs || [], g, 0.6);
  }
  writeMemory(m);
}

export function noteToolOpened(tool: string) {
  const t = tool.trim().slice(0, 40);
  if (!t) return;
  const m = readMemory();
  const at = new Date().toISOString();
  m.recentTools = [{ tool: t, at }, ...(m.recentTools || [])].slice(
    0,
    MAX_TOOLS,
  );
  writeMemory(m);
}

export function noteRecommendationSignal(
  kind:
    | "recommendation_shown"
    | "recommendation_opened"
    | "recommendation_accepted"
    | "recommendation_rejected",
  _animeId: number,
) {
  const m = readMemory();
  const stats = m.recStats || emptyRecStats();
  if (kind === "recommendation_shown") stats.shown += 1;
  if (kind === "recommendation_opened") stats.opened += 1;
  if (kind === "recommendation_accepted") stats.accepted += 1;
  if (kind === "recommendation_rejected") stats.rejected += 1;
  m.recStats = stats;
  writeMemory(m);
}

export function noteWatchlistSignal(
  kind: "added" | "removed" | "started" | "dropped",
  _animeId: number,
) {
  const m = readMemory();
  const s = m.watchlistSignals || emptyWatchSignals();
  s[kind] += 1;
  m.watchlistSignals = s;
  writeMemory(m);
}

function topKeys(map: Record<string, number>, n = 3): string[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function hourBucket(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return "late-night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "late-night";
}

export function ritualLine(opts?: {
  watchingTitles?: string[];
  planningCount?: number;
}): string {
  const m = readMemory();
  const bucket = hourBucket();
  const topGenres = getGenrePreferences(m)
    .filter((p) => p.confidence >= 0.3)
    .slice(0, 2)
    .map((p) => p.value);
  const fallbackGenres = topKeys(m.genreCounts, 2);
  const genres = topGenres.length ? topGenres : fallbackGenres;
  const recent = m.recentViews[0];
  const days = m.visitDays.length;
  const lastDone = m.completedLog[0];

  const watching = opts?.watchingTitles?.filter(Boolean) || [];
  if (watching.length > 0) {
    const t = watching[0];
    if (bucket === "late-night") {
      return `Still mid-frequency with “${t}”? Lantern kept the seat warm.`;
    }
    return `You’re still tuned to “${t}”. Pick up where the signal left off.`;
  }

  if (lastDone) {
    const hours =
      (Date.now() - new Date(lastDone.at).getTime()) / (1000 * 60 * 60);
    if (hours < 48) {
      return `You closed “${lastDone.title}” recently. The shelf feels a little lighter.`;
    }
  }

  if (opts?.planningCount && opts.planningCount > 3 && recent) {
    return `Your shelf has ${opts.planningCount} planned titles. “${recent.title}” was the last page you opened.`;
  }

  if (recent) {
    const hours =
      (Date.now() - new Date(recent.at).getTime()) / (1000 * 60 * 60);
    if (hours < 24) {
      return `Earlier you were looking at “${recent.title}”. Want to stay on that channel?`;
    }
    return `Last signal: “${recent.title}”. Lantern remembers the room you left.`;
  }

  if (genres.length >= 2) {
    return `Your recent orbit leans ${genres[0]} and ${genres[1]}. The desk is tuned accordingly.`;
  }
  if (genres.length === 1) {
    return `Lantern notices a pull toward ${genres[0]}. Browse when you’re ready.`;
  }

  if (days >= 3) {
    return `You’ve checked in ${days} different days. The frequency is becoming yours.`;
  }

  if (bucket === "morning") {
    return `Morning desk. Soft volume — Lantern will keep recommendations gentle.`;
  }
  if (bucket === "late-night") {
    return `Late broadcast. Lantern is online for slow scrolling and sharp picks.`;
  }
  if (bucket === "evening") {
    return `Evening console. The room is lit — pick a mood or open the catalog.`;
  }
  return `Lantern is listening. Open a title and the desk starts remembering.`;
}

export function memoryDigestForAI(opts?: {
  watching?: string[];
  completedCount?: number;
}): string {
  const m = readMemory();
  const genres = getGenrePreferences(m)
    .slice(0, 5)
    .map(
      (p) =>
        `${p.value} (conf ${p.confidence.toFixed(2)}, n=${p.evidenceCount})`,
    );
  const studios = topKeys(m.studioCounts, 3);
  const recent = m.recentViews
    .slice(0, 5)
    .map((r) => r.title)
    .join("; ");
  const done = m.completedLog
    .slice(0, 5)
    .map((c) => c.title)
    .join("; ");
  const searches = (m.recentSearches || [])
    .slice(0, 3)
    .map((s) => s.q)
    .join("; ");
  const lines = [
    "Lantern local memory (user browser, may be incomplete):",
    recent ? `Recently viewed: ${recent}` : "Recently viewed: (none yet)",
    done ? `Recently completed (logged): ${done}` : null,
    genres.length ? `Genre prefs: ${genres.join("; ")}` : null,
    studios.length ? `Studios noticed: ${studios.join(", ")}` : null,
    searches ? `Recent searches: ${searches}` : null,
    m.recStats
      ? `Rec signals shown/opened/accepted/rejected: ${m.recStats.shown}/${m.recStats.opened}/${m.recStats.accepted}/${m.recStats.rejected}`
      : null,
    opts?.watching?.length
      ? `Currently watching: ${opts.watching.slice(0, 5).join("; ")}`
      : null,
    opts?.completedCount != null
      ? `Completed on list: ${opts.completedCount}`
      : null,
    `Time bucket: ${hourBucket()}`,
    `Distinct visit days logged: ${m.visitDays.length}`,
  ];
  return lines.filter(Boolean).join("\n");
}
