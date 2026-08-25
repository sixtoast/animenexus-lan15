/**
 * Creative connections (API Expansion II Sprint 11).
 * Factual overlaps only — never "you like this because Studio X".
 */

import type { CreativeDnaSlot } from "./creative-dna";

export type ShelfTitle = {
  id: number;
  title: string;
  score?: number;
  studios?: string[];
  /** Optional staff names already resolved for that title */
  people?: string[];
};

export type CreativeConnection = {
  kind: "studio" | "person";
  name: string;
  /** How many shelf titles share this credit */
  shelfCount: number;
  /** Among highest-rated subset */
  topRatedCount?: number;
  examples: string[];
  line: string;
};

function normName(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Compare current title DNA against the user’s shelf.
 * `topRated` = shelf entries with score >= topThreshold (default 8).
 */
export function buildCreativeConnections(opts: {
  dna: CreativeDnaSlot[];
  shelf: ShelfTitle[];
  topThreshold?: number;
  limit?: number;
}): CreativeConnection[] {
  const topThreshold = opts.topThreshold ?? 8;
  const limit = opts.limit ?? 6;
  const shelf = opts.shelf;
  if (!shelf.length || !opts.dna.length) return [];

  const topRated = shelf.filter(
    (s) => s.score != null && s.score >= topThreshold,
  );

  const out: CreativeConnection[] = [];

  const studioSlot = opts.dna.find((d) => d.role === "animation_studio");
  if (studioSlot) {
    for (const studio of studioSlot.names) {
      const hits = shelf.filter((s) =>
        (s.studios || []).some((st) => normName(st) === normName(studio)),
      );
      if (hits.length < 2) continue;
      const topHits = topRated.filter((s) =>
        (s.studios || []).some((st) => normName(st) === normName(studio)),
      );
      const examples = hits.slice(0, 3).map((h) => h.title);
      let line = `${studio} appears in ${hits.length} titles on your shelf.`;
      if (topHits.length >= 2) {
        line = `${studio} appears in ${topHits.length} of your highest-rated titles (score ≥ ${topThreshold}).`;
      }
      out.push({
        kind: "studio",
        name: studio,
        shelfCount: hits.length,
        topRatedCount: topHits.length || undefined,
        examples,
        line,
      });
    }
  }

  const personRoles: Array<CreativeDnaSlot["role"]> = [
    "director",
    "series_composition",
    "music",
    "character_design",
    "original_creator",
  ];
  for (const role of personRoles) {
    const slot = opts.dna.find((d) => d.role === role);
    if (!slot) continue;
    for (const person of slot.names) {
      const hits = shelf.filter((s) =>
        (s.people || []).some((p) => normName(p) === normName(person)),
      );
      // Without people on shelf entries, we can only connect via same-title DNA later;
      // still allow studio-style lines when hits exist
      if (hits.length < 2) continue;
      const examples = hits.slice(0, 3).map((h) => h.title);
      out.push({
        kind: "person",
        name: person,
        shelfCount: hits.length,
        examples,
        line: `You’ve logged ${hits.length} titles involving ${person}.`,
      });
    }
  }

  // Sort by strength
  out.sort((a, b) => {
    const ta = a.topRatedCount ?? 0;
    const tb = b.topRatedCount ?? 0;
    if (tb !== ta) return tb - ta;
    return b.shelfCount - a.shelfCount;
  });

  return out.slice(0, limit);
}
