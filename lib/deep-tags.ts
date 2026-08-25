/**
 * Weighted deep tags (API Expansion II Sprint 6).
 * AniDB tags → DeepTag; spoilers hidden by default.
 * Used later for Resonance explanations — not a raw tag dump under the poster.
 */

import type { DeepTag } from "./deep-metadata";
import { topDeepTags } from "./deep-metadata";

/** Minimum weight to treat as a meaningful "signal" (AniDB weights are 0–600-ish). */
export const SIGNAL_WEIGHT_FLOOR = 200;

export function normalizeAniDbTag(raw: {
  name: string;
  weight?: number;
  description?: string;
  spoiler?: boolean;
}): DeepTag {
  return {
    name: raw.name.trim(),
    namespace: "anidb",
    description: raw.description?.trim() || undefined,
    weight: raw.weight,
    spoiler: Boolean(raw.spoiler),
    source: "anidb",
  };
}

/** Strong non-spoiler descriptors for UI / Resonance. */
export function deepSignals(
  tags: DeepTag[],
  limit = 8,
): DeepTag[] {
  return topDeepTags(tags, limit * 2, { allowSpoilers: false })
    .filter((t) => (t.weight == null ? true : t.weight >= SIGNAL_WEIGHT_FLOOR))
    .slice(0, limit);
}

/**
 * Overlap between two tag sets for Resonance-style explanations.
 * Returns shared signal names (non-spoiler, weighted when possible).
 */
export function sharedDeepSignals(
  a: DeepTag[],
  b: DeepTag[],
  limit = 5,
): string[] {
  const sigA = new Set(
    deepSignals(a, 24).map((t) => t.name.toLowerCase()),
  );
  const out: string[] = [];
  for (const t of deepSignals(b, 24)) {
    if (sigA.has(t.name.toLowerCase())) {
      out.push(t.name);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * Build a restrained explanation line — only when overlap exists.
 * Never invents emotional claims.
 */
export function resonanceTagLine(
  candidateTags: DeepTag[],
  referenceTags: DeepTag[],
): string | null {
  const shared = sharedDeepSignals(candidateTags, referenceTags, 3);
  if (!shared.length) return null;
  if (shared.length === 1) {
    return `Overlaps on a less obvious signal: ${shared[0]}`;
  }
  return `Overlaps on less obvious signals: ${shared.join(", ")}`;
}

/** Partition for Detail UI: genres stay AniList; deep signals are niche. */
export function partitionDescriptors(opts: {
  anilistGenres: string[];
  deepTags: DeepTag[];
}): {
  genres: string[];
  deepSignals: DeepTag[];
} {
  const genreSet = new Set(
    opts.anilistGenres.map((g) => g.toLowerCase()),
  );
  const signals = deepSignals(opts.deepTags, 8).filter(
    (t) => !genreSet.has(t.name.toLowerCase()),
  );
  return {
    genres: opts.anilistGenres,
    deepSignals: signals,
  };
}
