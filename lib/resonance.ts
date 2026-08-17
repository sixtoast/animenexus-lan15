/**
 * Anime Resonance Engine (Sprint 3)
 *
 * Multidimensional emotional / formal signature — not genre-only.
 * Values are heuristic (genre → dimension priors), not claimed facts.
 * Later sprints can refine sources; API stays stable.
 */

import type { WatchlistEntry } from "./types";
import { getGenrePreferences, readMemory } from "./lantern-memory";

/** Controlled dimension set from the evolution plan. */
export const RESONANCE_DIMENSIONS = [
  "wonder",
  "comfort",
  "intensity",
  "melancholy",
  "hope",
  "tension",
  "humour",
  "romance",
  "mystery",
  "reflection",
  "adventure",
  "darkness",
  "nostalgia",
  "energy",
  "characterFocus",
  "worldBuilding",
] as const;

export type ResonanceDim = (typeof RESONANCE_DIMENSIONS)[number];

export type ResonanceVector = Record<ResonanceDim, number>;

export function emptyResonance(): ResonanceVector {
  const v = {} as ResonanceVector;
  for (const d of RESONANCE_DIMENSIONS) v[d] = 0;
  return v;
}

/** Genre → soft dimension priors (0–1). Heuristic only. */
const GENRE_PRIORS: Record<string, Partial<ResonanceVector>> = {
  Fantasy: { wonder: 0.85, worldBuilding: 0.8, adventure: 0.7, hope: 0.5 },
  Adventure: { adventure: 0.9, energy: 0.75, wonder: 0.55 },
  Action: { intensity: 0.85, energy: 0.8, tension: 0.65 },
  Drama: { reflection: 0.7, melancholy: 0.55, characterFocus: 0.75 },
  Romance: { romance: 0.9, comfort: 0.5, hope: 0.45 },
  Comedy: { humour: 0.9, energy: 0.55, comfort: 0.4 },
  "Slice of Life": { comfort: 0.85, nostalgia: 0.5, characterFocus: 0.65 },
  Mystery: { mystery: 0.9, tension: 0.6, reflection: 0.45 },
  Horror: { darkness: 0.9, tension: 0.85, intensity: 0.7 },
  Thriller: { tension: 0.9, intensity: 0.75, mystery: 0.5 },
  Psychological: { reflection: 0.85, darkness: 0.55, characterFocus: 0.8 },
  SciFi: { wonder: 0.7, worldBuilding: 0.85, mystery: 0.4 },
  "Sci-Fi": { wonder: 0.7, worldBuilding: 0.85, mystery: 0.4 },
  Supernatural: { wonder: 0.65, mystery: 0.55, darkness: 0.35 },
  Mecha: { intensity: 0.6, worldBuilding: 0.7, energy: 0.55 },
  Sports: { energy: 0.85, hope: 0.55, intensity: 0.5 },
  Music: { emotion: 0.5, hope: 0.45, characterFocus: 0.55 } as Partial<ResonanceVector>,
  "Martial Arts": { intensity: 0.7, energy: 0.65, adventure: 0.5 },
  Military: { intensity: 0.65, tension: 0.6, darkness: 0.4 },
  Historical: { nostalgia: 0.6, worldBuilding: 0.55, reflection: 0.5 },
  Samurai: { intensity: 0.55, nostalgia: 0.5, characterFocus: 0.5 },
  "Mahou Shoujo": { wonder: 0.75, hope: 0.7, energy: 0.55 },
  "Magical Girl": { wonder: 0.75, hope: 0.7, energy: 0.55 },
  Isekai: { adventure: 0.8, wonder: 0.7, worldBuilding: 0.65 },
  Tragedy: { melancholy: 0.9, darkness: 0.7, reflection: 0.65 },
  "Gore": { darkness: 0.85, intensity: 0.8 },
  Suspense: { tension: 0.85, mystery: 0.55 },
  "Avant Garde": { reflection: 0.7, mystery: 0.5 },
  Kids: { comfort: 0.7, hope: 0.6, humour: 0.4 },
  Hentai: {},
  Ecchi: { humour: 0.35, romance: 0.3 },
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function normalizeResonance(v: ResonanceVector): ResonanceVector {
  let max = 0;
  for (const d of RESONANCE_DIMENSIONS) max = Math.max(max, v[d]);
  if (max <= 0) return emptyResonance();
  const out = emptyResonance();
  for (const d of RESONANCE_DIMENSIONS) out[d] = clamp01(v[d] / max);
  return out;
}

/** Heuristic anime signature from genre list (+ optional tags). */
export function resonanceFromGenres(
  genres: string[] | undefined | null,
  tags?: string[],
): ResonanceVector {
  const acc = emptyResonance();
  const labels = [...(genres || []), ...(tags || [])];
  if (!labels.length) return acc;

  let hits = 0;
  for (const raw of labels) {
    const g = raw.trim();
    if (!g) continue;
    const prior =
      GENRE_PRIORS[g] ||
      GENRE_PRIORS[g.replace(/-/g, " ")] ||
      Object.entries(GENRE_PRIORS).find(
        ([k]) => k.toLowerCase() === g.toLowerCase(),
      )?.[1];
    if (!prior) continue;
    hits++;
    for (const d of RESONANCE_DIMENSIONS) {
      const p = prior[d];
      if (p != null) acc[d] += p;
    }
  }

  if (hits === 0) return acc;
  for (const d of RESONANCE_DIMENSIONS) acc[d] /= hits;
  return normalizeResonance(acc);
}

/** Interaction weight for building the user vector. */
export function interactionWeight(e: WatchlistEntry): number {
  let w =
    e.watchStatus === "completed"
      ? 1.35
      : e.watchStatus === "watching"
        ? 1.15
        : e.watchStatus === "dropped"
          ? 0.25
          : e.watchStatus === "paused"
            ? 0.7
            : 0.85;
  if (e.userRating && e.userRating > 0) {
    w *= 0.55 + e.userRating / 10; // 1→0.65 … 10→1.55
  }
  return w;
}

/** Aggregate user resonance from watchlist (+ optional memory genre prefs). */
export function userResonance(
  entries: WatchlistEntry[],
  opts?: { includeMemory?: boolean },
): ResonanceVector {
  const acc = emptyResonance();
  let totalW = 0;

  for (const e of entries) {
    const w = interactionWeight(e);
    if (w <= 0) continue;
    const vec = resonanceFromGenres(e.genres);
    let any = false;
    for (const d of RESONANCE_DIMENSIONS) {
      if (vec[d] > 0) any = true;
      acc[d] += vec[d] * w;
    }
    if (any) totalW += w;
  }

  if (opts?.includeMemory !== false && typeof window !== "undefined") {
    try {
      const prefs = getGenrePreferences(readMemory());
      for (const p of prefs.slice(0, 8)) {
        const w = p.score * p.confidence * 0.45;
        const vec = resonanceFromGenres([p.value]);
        for (const d of RESONANCE_DIMENSIONS) acc[d] += vec[d] * w;
        totalW += w;
      }
    } catch {
      /* memory optional */
    }
  }

  if (totalW <= 0) return emptyResonance();
  for (const d of RESONANCE_DIMENSIONS) acc[d] /= totalW;
  return normalizeResonance(acc);
}

export function cosineSimilarity(
  a: ResonanceVector,
  b: ResonanceVector,
): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const d of RESONANCE_DIMENSIONS) {
    dot += a[d] * b[d];
    na += a[d] * a[d];
    nb += b[d] * b[d];
  }
  if (na <= 0 || nb <= 0) return 0;
  return clamp01(dot / (Math.sqrt(na) * Math.sqrt(nb)));
}

/** Top dimensions for UI copy. */
export function topResonanceDims(
  v: ResonanceVector,
  n = 5,
): { dim: ResonanceDim; value: number }[] {
  return RESONANCE_DIMENSIONS.map((dim) => ({ dim, value: v[dim] }))
    .filter((x) => x.value > 0.05)
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export function resonanceLabel(dim: ResonanceDim): string {
  const labels: Record<ResonanceDim, string> = {
    wonder: "Wonder",
    comfort: "Comfort",
    intensity: "Intensity",
    melancholy: "Melancholy",
    hope: "Hope",
    tension: "Tension",
    humour: "Humour",
    romance: "Romance",
    mystery: "Mystery",
    reflection: "Reflection",
    adventure: "Adventure",
    darkness: "Darkness",
    nostalgia: "Nostalgia",
    energy: "Energy",
    characterFocus: "Character focus",
    worldBuilding: "World-building",
  };
  return labels[dim];
}

/** Human-readable profile line from user vector. */
export function describeUserResonance(v: ResonanceVector): string {
  const top = topResonanceDims(v, 3);
  if (!top.length) {
    return "Lantern has not locked a resonance profile yet — open and seal a few titles.";
  }
  const names = top.map((t) => resonanceLabel(t.dim));
  if (names.length === 1) return `Your signal leans toward ${names[0]}.`;
  if (names.length === 2)
    return `Your signal sits between ${names[0]} and ${names[1]}.`;
  return `Your strongest frequencies are ${names[0]}, ${names[1]}, and ${names[2]}.`;
}
