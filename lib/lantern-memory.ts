/**
 * Lantern Memory v0 — local persistent memory for the host persona.
 * Browser-only; never blocks rendering if storage fails.
 */

const KEY = "anime_nexus_lantern_memory_v1";
const MAX_RECENT = 24;
const MAX_COMPLETED = 40;

export type RecentView = {
  id: number;
  title: string;
  image?: string;
  at: string; // ISO
};

export type CompletedLog = {
  id: number;
  title: string;
  at: string;
};

export type LanternMemory = {
  version: 1;
  recentViews: RecentView[];
  completedLog: CompletedLog[];
  /** genre string -> count */
  genreCounts: Record<string, number>;
  studioCounts: Record<string, number>;
  visitDays: string[]; // YYYY-MM-DD unique recent days
  lastVisitAt: string | null;
  sessionOpens: number;
  firstSeenAt: string | null;
};

function empty(): LanternMemory {
  return {
    version: 1,
    recentViews: [],
    completedLog: [],
    genreCounts: {},
    studioCounts: {},
    visitDays: [],
    lastVisitAt: null,
    sessionOpens: 0,
    firstSeenAt: null,
  };
}

export function readMemory(): LanternMemory {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<LanternMemory>;
    return {
      ...empty(),
      ...parsed,
      version: 1,
      recentViews: Array.isArray(parsed.recentViews) ? parsed.recentViews : [],
      completedLog: Array.isArray(parsed.completedLog)
        ? parsed.completedLog
        : [],
      genreCounts: parsed.genreCounts || {},
      studioCounts: parsed.studioCounts || {},
      visitDays: Array.isArray(parsed.visitDays) ? parsed.visitDays : [],
    };
  } catch {
    return empty();
  }
}

export function writeMemory(m: LanternMemory) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* quota */
  }
}

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Call once per app session open */
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
  }
  for (const s of input.studios || []) {
    const k = s.trim();
    if (!k) continue;
    m.studioCounts[k] = (m.studioCounts[k] || 0) + 1;
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

/** One thoughtful line for the home ritual — never empty fluff */
export function ritualLine(opts?: {
  watchingTitles?: string[];
  planningCount?: number;
}): string {
  const m = readMemory();
  const bucket = hourBucket();
  const topGenres = topKeys(m.genreCounts, 2);
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

  if (topGenres.length >= 2) {
    return `Your recent orbit leans ${topGenres[0]} and ${topGenres[1]}. The desk is tuned accordingly.`;
  }
  if (topGenres.length === 1) {
    return `Lantern notices a pull toward ${topGenres[0]}. Browse when you’re ready.`;
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

/** Compact digest for AI system prompts */
export function memoryDigestForAI(opts?: {
  watching?: string[];
  completedCount?: number;
}): string {
  const m = readMemory();
  const genres = topKeys(m.genreCounts, 5);
  const studios = topKeys(m.studioCounts, 3);
  const recent = m.recentViews
    .slice(0, 5)
    .map((r) => r.title)
    .join("; ");
  const done = m.completedLog
    .slice(0, 5)
    .map((c) => c.title)
    .join("; ");
  const lines = [
    "Lantern local memory (user browser, may be incomplete):",
    recent ? `Recently viewed: ${recent}` : "Recently viewed: (none yet)",
    done ? `Recently completed (logged): ${done}` : null,
    genres.length ? `Genre affinity counts: ${genres.join(", ")}` : null,
    studios.length ? `Studios noticed: ${studios.join(", ")}` : null,
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
