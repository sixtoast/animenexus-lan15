/**
 * Rewatch sessions (API Expansion II Sprint 26).
 * Local-first. Simkl can consume the same shape later for sync — not required now.
 */

const KEY = "animenexus.rewatch-sessions.v1";
const MAX = 80;

export type RewatchSession = {
  id: string;
  animeId: number;
  title: string;
  image?: string;
  /** ISO start */
  startedAt: string;
  /** ISO end when finished; omit while active */
  endedAt?: string;
  /** Last episode reached in this pass */
  episode?: number;
  note?: string;
  /** simkl | local */
  source: "local" | "simkl";
};

function readAll(): RewatchSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RewatchSession[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAll(list: RewatchSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* */
  }
}

export function listRewatchSessions(): RewatchSession[] {
  return readAll().sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

export function activeRewatchFor(animeId: number): RewatchSession | undefined {
  return readAll().find((s) => s.animeId === animeId && !s.endedAt);
}

export function startRewatch(opts: {
  animeId: number;
  title: string;
  image?: string;
  episode?: number;
  note?: string;
}): RewatchSession {
  const existing = activeRewatchFor(opts.animeId);
  if (existing) return existing;

  const session: RewatchSession = {
    id: `rw-${opts.animeId}-${Date.now()}`,
    animeId: opts.animeId,
    title: opts.title,
    image: opts.image,
    startedAt: new Date().toISOString(),
    episode: opts.episode,
    note: opts.note,
    source: "local",
  };
  writeAll([session, ...readAll()]);
  return session;
}

export function updateRewatch(
  id: string,
  patch: Partial<Pick<RewatchSession, "episode" | "note" | "endedAt">>,
): RewatchSession | null {
  const list = readAll();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  writeAll(list);
  return list[i];
}

export function endRewatch(id: string, episode?: number): RewatchSession | null {
  return updateRewatch(id, {
    endedAt: new Date().toISOString(),
    ...(episode != null ? { episode } : {}),
  });
}

export function deleteRewatch(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function rewatchCountFor(animeId: number): number {
  return readAll().filter((s) => s.animeId === animeId).length;
}
