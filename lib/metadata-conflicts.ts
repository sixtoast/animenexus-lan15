/**
 * Metadata provenance & conflict strategy (API Expansion II Sprint 3).
 *
 * Canonical catalog values (episodes, score, status, …) stay governed by the
 * existing AniList-first hierarchy. Deep metadata may expose disagreements
 * without silently overwriting core fields.
 */

import type { MetadataProvenance } from "./deep-metadata";
import { nowProvenance } from "./deep-metadata";

export type FieldObservation = {
  field: string;
  value: string;
  source: string;
  confidence?: number;
  retrievedAt?: string;
};

export type FieldConflict = {
  field: string;
  observations: FieldObservation[];
  /** True when two+ distinct values exist */
  disagree: boolean;
  /** Value chosen for *display* of core fields only — may be null if unresolved */
  canonicalHint?: string;
  /** Human note for UI / diagnostics */
  message: string;
};

/** Provider priority for *core* canonical fields only (not deep tags). */
export const CORE_SOURCE_PRIORITY: string[] = [
  "anilist",
  "mal",
  "jikan",
  "kitsu",
  "shikimori",
  "anidb",
  "simkl",
];

function normalizeValue(v: string): string {
  return v.trim().toLowerCase();
}

export function collectConflict(
  field: string,
  observations: FieldObservation[],
): FieldConflict {
  const filtered = observations.filter((o) => o.value != null && o.value !== "");
  const unique = new Map<string, FieldObservation>();
  for (const o of filtered) {
    const k = normalizeValue(o.value);
    if (!unique.has(k)) unique.set(k, o);
  }
  const disagree = unique.size > 1;

  let canonicalHint: string | undefined;
  if (!disagree && filtered.length) {
    canonicalHint = filtered[0].value;
  } else if (disagree) {
    // Prefer AniList-first for core-like fields; never invent a value
    const ranked = [...filtered].sort((a, b) => {
      const ia = CORE_SOURCE_PRIORITY.indexOf(a.source.toLowerCase());
      const ib = CORE_SOURCE_PRIORITY.indexOf(b.source.toLowerCase());
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    canonicalHint = ranked[0]?.value;
  }

  return {
    field,
    observations: filtered,
    disagree,
    canonicalHint,
    message: disagree
      ? `Sources disagree on ${field}.`
      : filtered.length
        ? `${field} consistent across sources.`
        : `No observations for ${field}.`,
  };
}

/** Example: episode counts from multiple providers. */
export function conflictEpisodeCount(
  values: { source: string; episodes: number | string | null | undefined }[],
): FieldConflict {
  const observations: FieldObservation[] = values
    .filter((v) => v.episodes != null && v.episodes !== "")
    .map((v) => ({
      field: "episodes",
      value: String(v.episodes),
      source: v.source,
      retrievedAt: new Date().toISOString(),
    }));
  return collectConflict("episodes", observations);
}

export type ProvenanceBag = {
  value: unknown;
  provenance: MetadataProvenance;
};

/** Wrap a fact with required origin (Sprint 3 contract). */
export function withProvenance<T>(
  value: T,
  source: string,
  confidence?: number,
  method?: string,
): ProvenanceBag<T> {
  return {
    value,
    provenance: nowProvenance(source, confidence, method),
  };
}

/**
 * Diagnostics helper: group observations by field for /dev inspector later.
 */
export function indexObservations(
  list: FieldObservation[],
): Record<string, FieldConflict> {
  const byField = new Map<string, FieldObservation[]>();
  for (const o of list) {
    const arr = byField.get(o.field) || [];
    arr.push(o);
    byField.set(o.field, arr);
  }
  const out: Record<string, FieldConflict> = {};
  for (const [field, obs] of byField) {
    out[field] = collectConflict(field, obs);
  }
  return out;
}

/** UI-safe summary line when deep/core sources conflict. */
export function conflictSummaryLine(c: FieldConflict): string | null {
  if (!c.disagree) return null;
  const parts = c.observations.map((o) => `${o.source}: ${o.value}`);
  return `Sources disagree on ${c.field} (${parts.join(" · ")}). Canonical catalog still follows AniList-first hierarchy.`;
}
