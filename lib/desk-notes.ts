/**
 * Editorial desk notes — short local journal lines (not private diary).
 * Surface as soft ranking reasons and a home strip of recent notes.
 */

const KEY = "animenexus.desk-notes.v1";

export type DeskNote = {
  animeId: number;
  title: string;
  note: string;
  updatedAt: string;
};

type Store = Record<string, DeskNote>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Store;
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

function writeStore(s: Store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

export function readDeskNote(animeId: number): DeskNote | null {
  return readStore()[String(animeId)] || null;
}

export function writeDeskNote(
  animeId: number,
  title: string,
  note: string,
): void {
  const s = readStore();
  const trimmed = note.trim().slice(0, 280);
  if (!trimmed) {
    delete s[String(animeId)];
  } else {
    s[String(animeId)] = {
      animeId,
      title,
      note: trimmed,
      updatedAt: new Date().toISOString(),
    };
  }
  writeStore(s);
}

export function listDeskNotes(limit = 12): DeskNote[] {
  return Object.values(readStore())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

/** Soft signal: titles with desk notes get a tiny ranking nudge + reason. */
export function deskNoteBoost(animeId: number): {
  boost: number;
  reason?: string;
} {
  const n = readDeskNote(animeId);
  if (!n) return { boost: 0 };
  const age =
    (Date.now() - new Date(n.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  const freshness = age < 14 ? 1 : age < 60 ? 0.6 : 0.3;
  return {
    boost: 0.04 * freshness,
    reason: "You left a desk note on this title",
  };
}
