/**
 * Living Shelf data architecture (Awwwards Sprint 4).
 *
 * Does NOT store XYZ in core watchlist data.
 * Layout is derived deterministically for spatial views (Sprint 5+).
 */

import type { WatchStatus, WatchlistEntry } from "./types";
import {
  materialFromAnime,
  type AnimeMaterialProfile,
} from "./anime-material";
import {
  cosineSimilarity,
  interactionWeight,
  resonanceFromGenres,
  userResonance,
} from "./resonance";

export type WatchlistPresentation = "manage" | "shelf";

const PRESENTATION_KEY = "anime_nexus_watchlist_presentation";

export function readWatchlistPresentation(): WatchlistPresentation {
  if (typeof window === "undefined") return "manage";
  try {
    const v = localStorage.getItem(PRESENTATION_KEY);
    if (v === "shelf" || v === "manage") return v;
  } catch {
    /* ignore */
  }
  return "manage";
}

export function writeWatchlistPresentation(mode: WatchlistPresentation): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESENTATION_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Meaningful spatial clusters (status-first). */
export type ShelfCluster =
  | "watching"
  | "planning"
  | "paused"
  | "completed"
  | "dropped";

export type ShelfObject = {
  animeId: number;
  title: string;
  image: string;
  cluster: ShelfCluster;
  /** 0–1 prominence in the spatial field */
  importance: number;
  /** 0 = near, 1 = far (derived, not stored) */
  depth: number;
  /** Relative display scale */
  scale: number;
  progress: number;
  progressRatio: number;
  state: WatchStatus;
  material: AnimeMaterialProfile;
  /** Stable 0–1 seed from id for layout jitter */
  seed: number;
  userRating: number;
  addedAt: string;
};

function episodeCap(e: WatchlistEntry): number {
  const n =
    typeof e.episodes === "number"
      ? e.episodes
      : parseInt(String(e.episodes || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

/** Deterministic 0–1 from anime id (layout only). */
export function shelfSeed(animeId: number): number {
  const x = Math.sin(animeId * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function clusterFor(status: WatchStatus): ShelfCluster {
  return status;
}

/**
 * Project watchlist entries → shelf objects.
 * Depth / scale / importance are derived for rendering — never persisted as core data.
 */
export function projectShelfObjects(entries: WatchlistEntry[]): ShelfObject[] {
  if (!entries.length) return [];

  const user = userResonance(entries);

  return entries.map((e) => {
    const cap = episodeCap(e);
    const progressRatio = Math.min(1, (e.progress || 0) / cap);
    const w = interactionWeight(e);
    const sim = cosineSimilarity(user, resonanceFromGenres(e.genres));
    const seed = shelfSeed(e.id);

    // Importance: engagement + resonance + rating nudge
    let importance = 0.35 * w + 0.4 * sim;
    if (e.userRating > 0) importance += 0.15 * (e.userRating / 10);
    if (e.watchStatus === "watching") importance += 0.12;
    if (e.watchStatus === "completed") importance += 0.08;
    importance = Math.max(0.08, Math.min(1, importance));

    // Depth by status (watching near, dropped far)
    let depth =
      e.watchStatus === "watching"
        ? 0.15 + seed * 0.1
        : e.watchStatus === "planning"
          ? 0.45 + seed * 0.15
          : e.watchStatus === "paused"
            ? 0.55 + seed * 0.12
            : e.watchStatus === "completed"
              ? 0.35 + seed * 0.12
              : 0.75 + seed * 0.15; // dropped

    // Watching progress pulls slightly forward
    if (e.watchStatus === "watching") {
      depth = Math.max(0.05, depth - progressRatio * 0.12);
    }

    const scale =
      0.75 +
      importance * 0.35 +
      (e.watchStatus === "watching" ? 0.08 : 0);

    const material = materialFromAnime({
      genres: e.genres,
      tags: e.tags,
    });

    return {
      animeId: e.id,
      title: e.title,
      image: e.image,
      cluster: clusterFor(e.watchStatus),
      importance,
      depth: Math.max(0, Math.min(1, depth)),
      scale: Math.max(0.65, Math.min(1.25, scale)),
      progress: e.progress || 0,
      progressRatio,
      state: e.watchStatus,
      material,
      seed,
      userRating: e.userRating || 0,
      addedAt: e.addedAt,
    };
  });
}

export function groupShelfByCluster(
  objects: ShelfObject[],
): Record<ShelfCluster, ShelfObject[]> {
  const groups: Record<ShelfCluster, ShelfObject[]> = {
    watching: [],
    planning: [],
    paused: [],
    completed: [],
    dropped: [],
  };
  for (const o of objects) {
    groups[o.cluster].push(o);
  }
  for (const k of Object.keys(groups) as ShelfCluster[]) {
    groups[k].sort((a, b) => b.importance - a.importance);
  }
  return groups;
}

export const SHELF_CLUSTER_LABELS: Record<ShelfCluster, string> = {
  watching: "Watching",
  planning: "Planning",
  paused: "Paused",
  completed: "Completed",
  dropped: "Dropped",
};
