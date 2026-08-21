/**
 * Living Shelf resonance relationship (Awwwards Sprint 6).
 * Facts vs model-derived interpretation — never invent claims.
 */

import type { WatchlistEntry } from "./types";
import {
  cosineSimilarity,
  resonanceFromGenres,
  topResonanceDims,
  resonanceLabel,
  type ResonanceDim,
} from "./resonance";

export type ShelfRelationship = {
  animeIdA: number;
  animeIdB: number;
  titleA: string;
  titleB: string;
  /** 0–1 cosine on resonance vectors */
  resonanceOverlap: number;
  sharedGenres: string[];
  /** Top shared resonance dimensions (model-derived) */
  sharedDims: { dim: ResonanceDim; label: string; strength: number }[];
  /** Human lines — clearly framed */
  factLines: string[];
  modelLines: string[];
};

function entryGenres(e: WatchlistEntry): string[] {
  return [...(e.genres || []), ...(e.tags || [])].map((g) => g.trim()).filter(Boolean);
}

export function describeShelfPair(
  a: WatchlistEntry,
  b: WatchlistEntry,
): ShelfRelationship {
  const ga = entryGenres(a);
  const gb = entryGenres(b);
  const setB = new Set(gb.map((g) => g.toLowerCase()));
  const sharedGenres = ga.filter((g) => setB.has(g.toLowerCase()));
  const uniqueShared = [...new Set(sharedGenres)];

  const va = resonanceFromGenres(ga);
  const vb = resonanceFromGenres(gb);
  const overlap = cosineSimilarity(va, vb);

  const topA = topResonanceDims(va, 6);
  const topB = new Map(topResonanceDims(vb, 6).map((t) => [t.dim, t.value]));
  const sharedDims = topA
    .filter((t) => (topB.get(t.dim) ?? 0) > 0.12)
    .map((t) => ({
      dim: t.dim,
      label: resonanceLabel(t.dim),
      strength: Math.min(t.value, topB.get(t.dim) ?? 0),
    }))
    .sort((x, y) => y.strength - x.strength)
    .slice(0, 4);

  const factLines: string[] = [];
  if (uniqueShared.length) {
    factLines.push(`Shared tags/genres: ${uniqueShared.slice(0, 6).join(", ")}`);
  } else {
    factLines.push("No shared genre labels in shelf metadata.");
  }
  if (a.format && b.format && a.format === b.format) {
    factLines.push(`Same format: ${a.format}`);
  }
  if (a.year && b.year && String(a.year) === String(b.year)) {
    factLines.push(`Same year: ${a.year}`);
  }

  const modelLines: string[] = [];
  modelLines.push(
    `Resonance overlap ${Math.round(overlap * 100)}% (AnimeNexus model — heuristic, not a fact).`,
  );
  if (sharedDims.length) {
    modelLines.push(
      `Shared frequencies: ${sharedDims.map((d) => d.label).join(", ")}.`,
    );
  }

  return {
    animeIdA: a.id,
    animeIdB: b.id,
    titleA: a.title,
    titleB: b.title,
    resonanceOverlap: overlap,
    sharedGenres: uniqueShared,
    sharedDims,
    factLines,
    modelLines,
  };
}

/** Proximity band for UI (Sprint 6 drag metaphor). */
export function proximityBand(overlap: number): "far" | "near" | "close" {
  if (overlap >= 0.55) return "close";
  if (overlap >= 0.28) return "near";
  return "far";
}
