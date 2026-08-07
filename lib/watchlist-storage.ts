import type { Anime, WatchStatus, WatchlistEntry } from "./types";

export const WATCHLIST_KEY = "animenexus.watchlist.v1";

export const WATCH_STATUS_TABS: { value: WatchStatus | "all"; label: string }[] =
  [
    { value: "all", label: "All" },
    { value: "watching", label: "Watching" },
    { value: "planning", label: "Planning" },
    { value: "completed", label: "Completed" },
    { value: "paused", label: "Paused" },
    { value: "dropped", label: "Dropped" },
  ];

function now() {
  return new Date().toISOString();
}

export function normalizeEntry(
  entry: Partial<WatchlistEntry> & { id: number; title: string },
): WatchlistEntry {
  return {
    id: entry.id,
    title: entry.title,
    image: entry.image || "https://placehold.co/400x600/1a1a1a/555?text=?",
    format: entry.format,
    year: entry.year,
    episodes: entry.episodes,
    duration: typeof entry.duration === "number" ? entry.duration : 24,
    score: entry.score,
    watchStatus: entry.watchStatus || "planning",
    progress: typeof entry.progress === "number" ? entry.progress : 0,
    userRating: typeof entry.userRating === "number" ? entry.userRating : 0,
    notes: typeof entry.notes === "string" ? entry.notes : "",
    tags: Array.isArray(entry.tags) ? entry.tags.map(String) : undefined,
    genres: Array.isArray((entry as { genres?: string[] }).genres)
      ? (entry as { genres?: string[] }).genres
      : undefined,
    addedAt: entry.addedAt || now(),
    updatedAt: entry.updatedAt || now(),
  };
}

export function readWatchlist(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) =>
      normalizeEntry(e as Partial<WatchlistEntry> & { id: number; title: string }),
    );
  } catch {
    return [];
  }
}

export function writeWatchlist(entries: WatchlistEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries));
}

export function animeToEntry(
  anime: Pick<
    Anime,
    | "id"
    | "title"
    | "image"
    | "format"
    | "year"
    | "episodes"
    | "duration"
    | "score"
    | "tags"
  >,
  status: WatchStatus = "planning",
): WatchlistEntry {
  return normalizeEntry({
    id: anime.id,
    title: anime.title,
    image: anime.image,
    format: anime.format,
    year: anime.year,
    episodes: anime.episodes,
    duration: anime.duration,
    score: anime.score,
    watchStatus: status,
    progress: 0,
    userRating: 0,
    notes: "",
    genres: anime.tags?.length ? [...anime.tags] : undefined,
  });
}
