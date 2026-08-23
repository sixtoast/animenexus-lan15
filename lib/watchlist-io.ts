import type { WatchlistEntry, WatchStatus } from "./types";
import { normalizeEntry, readWatchlist, writeWatchlist } from "./watchlist-storage";

const STATUSES: WatchStatus[] = [
  "watching",
  "planning",
  "completed",
  "paused",
  "dropped",
];

export function exportWatchlistJson(entries: WatchlistEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function downloadWatchlist(entries: WatchlistEntry[]) {
  const blob = new Blob([exportWatchlistJson(entries)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `animenexus-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseWatchlistImport(raw: string): WatchlistEntry[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Invalid format — expected an array");
  const out: WatchlistEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = Number(row.id ?? row.anilist_id);
    if (!id || Number.isNaN(id)) continue;
    const status = String(row.watchStatus || row.status || "planning").toLowerCase();
    const watchStatus = (STATUSES.includes(status as WatchStatus)
      ? status
      : "planning") as WatchStatus;
    out.push(
      normalizeEntry({
        id,
        title: String(row.title || "Untitled"),
        image: String(row.image || row.coverImage || ""),
        format: row.format as string | undefined,
        year: row.year as number | string | undefined,
        episodes: row.episodes as number | string | undefined,
        duration: typeof row.duration === "number" ? row.duration : undefined,
        score: typeof row.score === "number" ? row.score : undefined,
        watchStatus,
        progress: typeof row.progress === "number" ? row.progress : 0,
        userRating: typeof row.userRating === "number" ? row.userRating : 0,
        notes: typeof row.notes === "string" ? row.notes : "",
        tags: Array.isArray(row.tags) ? row.tags.map(String) : undefined,
        genres: Array.isArray(row.genres) ? row.genres.map(String) : undefined,
        addedAt: typeof row.addedAt === "string" ? row.addedAt : undefined,
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
      }),
    );
  }
  return out;
}

/** How to resolve progress/status conflicts on import */
export type ImportConflictPolicy =
  | "keep_local" // never overwrite existing
  | "prefer_incoming" // always take import
  | "furthest_progress"; // max progress; status from the side with more progress

export type MergeReport = {
  added: number;
  updated: number;
  skipped: number;
  conflicts: number;
  total: number;
};

function mergeEntry(
  prev: WatchlistEntry,
  incoming: WatchlistEntry,
  policy: ImportConflictPolicy,
): { entry: WatchlistEntry; conflict: boolean; applied: boolean } {
  const progressDiff = prev.progress !== incoming.progress;
  const statusDiff = prev.watchStatus !== incoming.watchStatus;
  const conflict = progressDiff || statusDiff;

  if (policy === "keep_local") {
    return { entry: prev, conflict, applied: false };
  }

  if (policy === "prefer_incoming") {
    return {
      entry: {
        ...prev,
        ...incoming,
        addedAt: prev.addedAt,
        updatedAt: new Date().toISOString(),
      },
      conflict,
      applied: true,
    };
  }

  // furthest_progress
  const useIncoming = incoming.progress > prev.progress;
  if (!conflict) {
    return {
      entry: {
        ...prev,
        ...incoming,
        addedAt: prev.addedAt,
        updatedAt: new Date().toISOString(),
      },
      conflict: false,
      applied: true,
    };
  }
  if (useIncoming) {
    return {
      entry: {
        ...prev,
        ...incoming,
        progress: Math.max(prev.progress, incoming.progress),
        addedAt: prev.addedAt,
        updatedAt: new Date().toISOString(),
      },
      conflict: true,
      applied: true,
    };
  }
  return {
    entry: {
      ...prev,
      progress: Math.max(prev.progress, incoming.progress),
      updatedAt: new Date().toISOString(),
    },
    conflict: true,
    applied: progressDiff,
  };
}

export function mergeWatchlistImport(
  incoming: WatchlistEntry[],
  policy: ImportConflictPolicy = "furthest_progress",
): MergeReport {
  const current = readWatchlist();
  const map = new Map(current.map((e) => [e.id, e]));
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const e of incoming) {
    if (map.has(e.id)) {
      const prev = map.get(e.id)!;
      const { entry, conflict, applied } = mergeEntry(prev, e, policy);
      if (conflict) conflicts += 1;
      if (applied) {
        map.set(e.id, entry);
        updated += 1;
      } else {
        skipped += 1;
      }
    } else {
      map.set(e.id, e);
      added += 1;
    }
  }
  const next = Array.from(map.values());
  writeWatchlist(next);
  return { added, updated, skipped, conflicts, total: next.length };
}
