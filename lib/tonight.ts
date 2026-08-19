import type { WatchlistEntry } from "./types";
import {
  interactionWeight,
  resonanceFromGenres,
  topResonanceDims,
  userResonance,
  cosineSimilarity,
} from "./resonance";

export const TONIGHT_KEY = "anime_nexus_tonight_queue";

export type TonightItem = {
  id: number;
  title: string;
  image: string;
  minutes?: number;
  /** Soft rank note for UI (optional). */
  why?: string;
};

export function readTonightQueue(): TonightItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TONIGHT_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export function writeTonightQueue(items: TonightItem[]) {
  localStorage.setItem(TONIGHT_KEY, JSON.stringify(items.slice(0, 8)));
}

/**
 * Build tonight queue from watching + planning.
 * Sorted by interaction weight × resonance alignment with the user vector.
 */
export function buildTonightFromList(entries: WatchlistEntry[]): TonightItem[] {
  const candidates = entries.filter(
    (e) => e.watchStatus === "watching" || e.watchStatus === "planning",
  );
  if (!candidates.length) return [];

  const user = userResonance(entries);
  const scored = candidates.map((e) => {
    const w = interactionWeight(e);
    const vec = resonanceFromGenres(e.genres);
    const sim = cosineSimilarity(user, vec);
    const statusBoost = e.watchStatus === "watching" ? 1.15 : 0.95;
    const score = (0.45 * w + 0.55 * Math.max(sim, 0.05)) * statusBoost;
    const top = topResonanceDims(vec, 1)[0];
    const why =
      e.watchStatus === "watching"
        ? top
          ? `In progress · ${top.dim}`
          : "In progress"
        : top
          ? `Planned · leans ${top.dim}`
          : "On the shelf";
    return { e, score, why };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map(({ e, why }) => ({
    id: e.id,
    title: e.title,
    image: e.image,
    minutes: (e.duration || 24) * Math.max(1, e.progress || 1),
    why,
  }));
}
