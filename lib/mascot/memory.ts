/**
 * Relationship memory — trust, pets, seals (Sprint M9).
 * localStorage only. Shapes bond stage + behaviour bias.
 */

const KEY = "anime_nexus_mascot_memory_v1";

export type CompanionMemory = {
  version: 1;
  trust: number;
  pets: number;
  ignores: number;
  seals: number;
  genres: Record<string, number>;
  lastPetAt: number;
  lastSeenAt: number;
  firstSeenAt: number;
  totalSessions: number;
};

export type BondStage = "stranger" | "acquaintance" | "friend" | "close";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function defaultMemory(): CompanionMemory {
  const now = Date.now();
  return {
    version: 1,
    trust: 0.35,
    pets: 0,
    ignores: 0,
    seals: 0,
    genres: {},
    lastPetAt: 0,
    lastSeenAt: now,
    firstSeenAt: now,
    totalSessions: 1,
  };
}

let cache: CompanionMemory | null = null;

export function loadMemory(): CompanionMemory {
  if (typeof window === "undefined") return defaultMemory();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultMemory();
    const parsed = JSON.parse(raw) as CompanionMemory;
    if (parsed?.version !== 1) return defaultMemory();
    return { ...defaultMemory(), ...parsed };
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

export function noteSessionStart() {
  const m = getMemory();
  const gap = Date.now() - (m.lastSeenAt || 0);
  if (gap > 30 * 60_000) {
    m.totalSessions += 1;
    if (gap > 7 * 24 * 60_000) m.trust = clamp01(m.trust - 0.05);
    else m.trust = clamp01(m.trust + 0.02);
  }
  m.lastSeenAt = Date.now();
  return commit(m);
}

export function notePet() {
  const m = getMemory();
  m.pets += 1;
  m.lastPetAt = Date.now();
  m.lastSeenAt = Date.now();
  const gain = 0.04 / (1 + m.pets * 0.02);
  m.trust = clamp01(m.trust + gain);
  return commit(m);
}

export function noteIgnore() {
  const m = getMemory();
  m.ignores += 1;
  m.trust = clamp01(m.trust - 0.015);
  return commit(m);
}

export function noteSeal() {
  const m = getMemory();
  m.seals += 1;
  m.trust = clamp01(m.trust + 0.05);
  m.lastSeenAt = Date.now();
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
  return commit(m);
}

export function bondStage(m: CompanionMemory = getMemory()): BondStage {
  if (m.trust >= 0.75 && m.pets >= 12) return "close";
  if (m.trust >= 0.55) return "friend";
  if (m.trust >= 0.4 || m.pets >= 3) return "acquaintance";
  return "stranger";
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
      return { stress: 0.04, confidence: -0.04 };
  }
}

export function bondGreeting(): string | null {
  const m = getMemory();
  const stage = bondStage(m);
  if (m.totalSessions <= 1) return null;
  if (stage === "close") return "You\u2019re back.";
  if (stage === "friend") return "Hey again.";
  if (stage === "acquaintance") return "\u2026oh. Hi.";
  return null;
}
