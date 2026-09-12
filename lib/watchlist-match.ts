/**
 * Match anime ↔ watchlist across AniList / MAL / local ids.
 * Mood feeds and cards must not miss a title because providers disagree on id.
 */
import type { Anime, WatchStatus, WatchlistEntry } from "./types";

/** Statuses treated as "already watched / done" for mood discovery. */
export const WATCHED_HIDE_STATUSES: WatchStatus[] = [
  "completed",
  "dropped",
];

/** Statuses still shown but flagged on cards via getEntry. */
export const ON_SHELF_FLAG_STATUSES: WatchStatus[] = [
  "watching",
  "paused",
  "planning",
];

export function entryIdSet(entries: WatchlistEntry[]): Set<number> {
  const s = new Set<number>();
  for (const e of entries) {
    if (e.id) s.add(e.id);
  }
  return s;
}

/** All numeric ids that could refer to this shelf row. */
export function idsForEntry(e: WatchlistEntry): number[] {
  const out = [e.id];
  return out.filter((n) => typeof n === "number" && n > 0);
}

/** All numeric ids that could refer to this anime card/candidate. */
export function idsForAnime(a: Anime): number[] {
  const out: number[] = [];
  if (a.id) out.push(a.id);
  if (a.anilist_id) out.push(a.anilist_id);
  if (a.idMal) out.push(a.idMal);
  return [...new Set(out.filter((n) => typeof n === "number" && n > 0))];
}

export function findWatchlistEntry(
  entries: WatchlistEntry[],
  animeOrId: Anime | number,
): WatchlistEntry | undefined {
  if (typeof animeOrId === "number") {
    return entries.find((e) => e.id === animeOrId);
  }
  const ids = new Set(idsForAnime(animeOrId));
  return entries.find((e) => ids.has(e.id));
}

export function isWatchedForMood(
  entries: WatchlistEntry[],
  anime: Anime,
): boolean {
  const e = findWatchlistEntry(entries, anime);
  if (!e) return false;
  return WATCHED_HIDE_STATUSES.includes(e.watchStatus);
}

/** Ids to exclude from mood ranking (completed + dropped + rejects). */
export function moodExcludeIds(
  entries: WatchlistEntry[],
  extra?: Iterable<number>,
): Set<number> {
  const s = new Set<number>();
  for (const e of entries) {
    if (WATCHED_HIDE_STATUSES.includes(e.watchStatus)) {
      s.add(e.id);
    }
  }
  if (extra) {
    for (const id of extra) s.add(id);
  }
  return s;
}

export function filterOutWatched(
  items: Anime[],
  entries: WatchlistEntry[],
): { visible: Anime[]; hidden: number } {
  if (!entries.length) return { visible: items, hidden: 0 };
  const visible: Anime[] = [];
  let hidden = 0;
  for (const a of items) {
    if (isWatchedForMood(entries, a)) {
      hidden++;
      continue;
    }
    visible.push(a);
  }
  return { visible, hidden };
}
