/**
 * Taste fatigue (R5) — temporary damping, not permanent dislike.
 * High affinity + high recent saturation → reduce frequency tonight.
 */

import type { Anime, WatchlistEntry } from "./types";
import { recentEvents, readBehaviourEvents } from "./behaviour-events";

export type FatigueProfile = {
  /** genre/tag → 0–1 recent saturation */
  tagSaturation: Record<string, number>;
  /** format → count */
  formatCounts: Record<string, number>;
  windowDays: number;
};

function tagKey(g: string): string {
  return String(g).toLowerCase().trim();
}

/**
 * Build saturation from recent shelf updates + behaviour events.
 */
export function buildFatigueProfile(
  entries: WatchlistEntry[],
  windowDays = 21,
): FatigueProfile {
  const cut = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const tagScores: Record<string, number> = {};
  const formatCounts: Record<string, number> = {};

  for (const e of entries) {
    const u = e.updatedAt ? new Date(e.updatedAt).getTime() : 0;
    if (u && u < cut) continue;
    const w =
      e.watchStatus === "completed" || e.watchStatus === "rewatching"
        ? 3
        : e.watchStatus === "watching"
          ? 2
          : e.watchStatus === "dropped"
            ? 0.5
            : 1;
    for (const g of e.genres || e.tags || []) {
      const k = tagKey(g);
      tagScores[k] = (tagScores[k] || 0) + w;
    }
    const fmt = String(e.format || "TV").toUpperCase();
    formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
  }

  for (const ev of recentEvents(windowDays)) {
    if (ev.weight <= 0 || !ev.animeId) continue;
    const entry = entries.find((x) => x.id === ev.animeId);
    if (!entry) continue;
    for (const g of entry.genres || entry.tags || []) {
      const k = tagKey(g);
      tagScores[k] =
        (tagScores[k] || 0) + Math.min(1.5, Math.abs(ev.weight) * 0.15);
    }
  }

  for (const ev of readBehaviourEvents({
    sinceMs: windowDays * 24 * 60 * 60 * 1000,
    kinds: ["exposure", "rec_shown"],
  })) {
    void ev;
  }

  const max = Math.max(...Object.values(tagScores), 1);
  const tagSaturation: Record<string, number> = {};
  for (const [k, v] of Object.entries(tagScores)) {
    tagSaturation[k] = Math.min(1, v / (max * 0.85));
  }

  return { tagSaturation, formatCounts, windowDays };
}

/**
 * 0 = no fatigue, 1 = heavily saturated for this title's tags.
 */
export function fatigueForAnime(
  anime: Anime,
  profile: FatigueProfile,
): number {
  const tags = (anime.tags || []).map(tagKey);
  if (!tags.length) return 0;
  let sum = 0;
  let n = 0;
  for (const t of tags.slice(0, 6)) {
    const s = profile.tagSaturation[t];
    if (s != null) {
      sum += s;
      n += 1;
    }
  }
  if (!n) return 0;
  const avg = sum / n;
  return avg >= 0.55 ? avg : avg * 0.35;
}

/** Multiplicative score factor (0.72–1). */
export function fatigueScoreFactor(fatigue: number): number {
  if (fatigue <= 0.2) return 1;
  if (fatigue <= 0.45) return 0.94;
  if (fatigue <= 0.7) return 0.85;
  return 0.72;
}
