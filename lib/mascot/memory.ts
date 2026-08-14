/**
 * Relationship memory — Sprint 7
 *
 * localStorage only. Shapes bond stage + soft behaviour bias.
 * Never guilt-inducing: long silence does not "punish" the user.
 * Ignore counters exist only as mild ambient signals, not penalties.
 */

const KEY = "anime_nexus_mascot_memory_v2";
const LEGACY_KEY = "anime_nexus_mascot_memory_v1";

export type CompanionMemory = {
  version: 2;
  trust: number;
  pets: number;
  /** Ambient only — does not subtract trust harshly */
  ignores: number;
  seals: number;
  /** Genre label → exposure count */
  genres: Record<string, number>;
  /** Pathname → visit count (no query/PII) */
  pages: Record<string, number>;
  /** Recent pathnames (max 8), oldest first */
  recentPages: string[];
  /** User engaged a pointed recommendation */
  recEngaged: number;
  /** Soft dismiss / no-click after point — not punitive */
  recPassed: number;
  lastPetAt: number;
  lastSeenAt: number;
  firstSeenAt: number;
  totalSessions: number;
  /** Last meaningful interaction timestamp */
  lastMeaningfulAt: number;
};

/** Plan: Stranger → Familiar → Friend → Close Companion */
export type BondStage = "stranger" | "acquaintance" | "friend" | "close";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function defaultMemory(): CompanionMemory {
  const now = Date.now();
  return {
    version: 2,
    trust: 0.35,
    pets: 0,
    ignores: 0,
    seals: 0,
    genres: {},
    pages: {},
    recentPages: [],
    recEngaged: 0,
    recPassed: 0,
    lastPetAt: 0,
    lastSeenAt: now,
    firstSeenAt: now,
    totalSessions: 1,
    lastMeaningfulAt: now,
  };
}

let cache: CompanionMemory | null = null;

function migrateV1(raw: Record<string, unknown>): CompanionMemory {
  const base = defaultMemory();
  return {
    ...base,
    trust: typeof raw.trust === "number" ? raw.trust : base.trust,
    pets: typeof raw.pets === "number" ? raw.pets : 0,
    ignores: typeof raw.ignores === "number" ? raw.ignores : 0,
    seals: typeof raw.seals === "number" ? raw.seals : 0,
    genres:
      raw.genres && typeof raw.genres === "object"
        ? (raw.genres as Record<string, number>)
        : {},
    lastPetAt: typeof raw.lastPetAt === "number" ? raw.lastPetAt : 0,
    lastSeenAt: typeof raw.lastSeenAt === "number" ? raw.lastSeenAt : Date.now(),
    firstSeenAt:
      typeof raw.firstSeenAt === "number" ? raw.firstSeenAt : Date.now(),
    totalSessions:
      typeof raw.totalSessions === "number" ? raw.totalSessions : 1,
    lastMeaningfulAt:
      typeof raw.lastPetAt === "number" && raw.lastPetAt > 0
        ? (raw.lastPetAt as number)
        : Date.now(),
  };
}

export function loadMemory(): CompanionMemory {
  if (typeof window === "undefined") return defaultMemory();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CompanionMemory;
      if (parsed?.version === 2) return { ...defaultMemory(), ...parsed };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Record<string, unknown>;
      const migrated = migrateV1(parsed);
      try {
        localStorage.setItem(KEY, JSON.stringify(migrated));
      } catch {
        /* quota */
      }
      return migrated;
    }
    return defaultMemory();
  } catch {
    return defaultMemory();
  }
}

export function getMemory(): CompanionMemory {
  if (!cache) cache = loadMemory();
  return cache;
}

function commit(m: CompanionMemory) {
  cache = m;
  if (typeof window === "undefined") return m;
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* quota */
  }
  return m;
}

function touchMeaningful(m: CompanionMemory) {
  m.lastMeaningfulAt = Date.now();
  m.lastSeenAt = Date.now();
}

export function noteSessionStart() {
  const m = getMemory();
  const gap = Date.now() - (m.lastSeenAt || 0);
  if (gap > 30 * 60_000) {
    m.totalSessions += 1;
    // Soft drift only — never sharp punishment for absence
    if (gap > 14 * 24 * 60_000) m.trust = clamp01(m.trust - 0.03);
    else if (gap > 30 * 60_000) m.trust = clamp01(m.trust + 0.015);
  }
  m.lastSeenAt = Date.now();
  return commit(m);
}

export function notePet() {
  const m = getMemory();
  m.pets += 1;
  m.lastPetAt = Date.now();
  touchMeaningful(m);
  const gain = 0.04 / (1 + m.pets * 0.02);
  m.trust = clamp01(m.trust + gain);
  return commit(m);
}

/**
 * Ambient long-idle signal. Trust dip is tiny and capped so silence
 * never feels like punishment (Sprint 7 design rule).
 */
export function noteIgnore() {
  const m = getMemory();
  m.ignores += 1;
  // Max −0.02 total effect from a single ignore, soft floor
  if (m.trust > 0.25) {
    m.trust = clamp01(m.trust - 0.008);
  }
  return commit(m);
}

export function noteSeal() {
  const m = getMemory();
  m.seals += 1;
  m.trust = clamp01(m.trust + 0.05);
  touchMeaningful(m);
  return commit(m);
}

export function noteGenres(labels: string[]) {
  if (!labels?.length) return getMemory();
  const m = getMemory();
  for (const raw of labels) {
    const g = raw.toLowerCase().trim();
    if (!g) continue;
    m.genres[g] = (m.genres[g] || 0) + 1;
  }
  touchMeaningful(m);
  return commit(m);
}

/** Track route visits without query strings or PII. */
export function notePage(pathname: string) {
  if (!pathname || typeof pathname !== "string") return getMemory();
  const path = pathname.split("?")[0].slice(0, 120) || "/";
  const m = getMemory();
  m.pages[path] = (m.pages[path] || 0) + 1;
  m.recentPages = [...m.recentPages.filter((p) => p !== path), path].slice(-8);
  m.lastSeenAt = Date.now();
  return commit(m);
}

/** User followed / clicked something the mascot pointed at. */
export function noteRecEngaged() {
  const m = getMemory();
  m.recEngaged += 1;
  m.trust = clamp01(m.trust + 0.03);
  touchMeaningful(m);
  return commit(m);
}

/** Soft pass — no trust penalty. */
export function noteRecPassed() {
  const m = getMemory();
  m.recPassed += 1;
  return commit(m);
}

export function bondStage(m: CompanionMemory = getMemory()): BondStage {
  // Close Companion
  if (m.trust >= 0.75 && (m.pets >= 12 || m.seals >= 5)) return "close";
  // Friend
  if (m.trust >= 0.55 && (m.pets >= 5 || m.seals >= 2 || m.recEngaged >= 3))
    return "friend";
  // Familiar (acquaintance)
  if (m.trust >= 0.4 || m.pets >= 3 || m.totalSessions >= 3) return "acquaintance";
  return "stranger";
}

/** Human-readable stage label matching the design plan. */
export function bondStageLabel(stage: BondStage = bondStage()): string {
  switch (stage) {
    case "close":
      return "Close Companion";
    case "friend":
      return "Friend";
    case "acquaintance":
      return "Familiar";
    default:
      return "Stranger";
  }
}

/** Top genres the user has been exposed to (from memory). */
export function favoriteGenres(limit = 3): string[] {
  const m = getMemory();
  return Object.entries(m.genres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => g);
}

/** Most visited pathnames. */
export function frequentPages(limit = 3): string[] {
  const m = getMemory();
  return Object.entries(m.pages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([p]) => p);
}

export function memoryEmotionBias(): Partial<{
  confidence: number;
  happiness: number;
  stress: number;
}> {
  switch (bondStage()) {
    case "close":
      return { confidence: 0.12, happiness: 0.08, stress: -0.08 };
    case "friend":
      return { confidence: 0.06, happiness: 0.04, stress: -0.04 };
    case "acquaintance":
      return { confidence: 0.02 };
    default:
      // Mild shyness only — not cold or punitive
      return { stress: 0.03, confidence: -0.03 };
  }
}

export function bondGreeting(): string | null {
  const m = getMemory();
  const stage = bondStage(m);
  if (m.totalSessions <= 1) return null;
  if (stage === "close") return "You’re back.";
  if (stage === "friend") return "Hey again.";
  if (stage === "acquaintance") return "…oh. Hi.";
  return null;
}

/** Soft line shaped by bond stage — used by decision layer */
export function relationshipThought(): string | null {
  const m = getMemory();
  const stage = bondStage(m);
  const fav = favoriteGenres(1)[0];
  const lines: Record<BondStage, string[]> = {
    stranger: ["…hello?", "Still figuring this desk out.", "Quiet signals."],
    acquaintance: ["Hmm.", "I’m getting used to you.", "Soft desk light."],
    friend: [
      "Still here.",
      "Want a signal?",
      "I kept the corner warm.",
      fav ? `More ${fav}?` : "Found a few signals.",
    ],
    close: [
      "Missed that.",
      "We’re good at this.",
      "I’ll find something for you.",
      fav ? `${fav} again?` : "Desk is ready.",
    ],
  };
  const pool = lines[stage];
  if (!pool?.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Behavioural hints derived from memory (for Director / decision).
 * No guilt language — only preference signals.
 */
export function relationshipHints(): {
  stage: BondStage;
  label: string;
  prefersGuide: boolean;
  prefersQuiet: boolean;
  engagementRate: number;
  msSinceMeaningful: number;
} {
  const m = getMemory();
  const stage = bondStage(m);
  const engaged = m.recEngaged;
  const passed = m.recPassed;
  const total = engaged + passed;
  const engagementRate = total > 0 ? engaged / total : 0.5;
  return {
    stage,
    label: bondStageLabel(stage),
    prefersGuide: stage === "close" || stage === "friend",
    prefersQuiet: stage === "stranger" || m.trust < 0.4,
    engagementRate,
    msSinceMeaningful: Date.now() - (m.lastMeaningfulAt || m.lastSeenAt),
  };
}
