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

export function mergeWatchlistImport(
  incoming: WatchlistEntry[],
): { added: number; updated: number; total: number } {
  const current = readWatchlist();
  const map = new Map(current.map((e) => [e.id, e]));
  let added = 0;
  let updated = 0;
  for (const e of incoming) {
    if (map.has(e.id)) {
      const prev = map.get(e.id)!;
      map.set(e.id, {
        ...prev,
        ...e,
        addedAt: prev.addedAt,
        updatedAt: new Date().toISOString(),
      });
      updated++;
    } else {
      map.set(e.id, e);
      added++;
    }
  }
  const next = Array.from(map.values());
  writeWatchlist(next);
  return { added, updated, total: next.length };
}
