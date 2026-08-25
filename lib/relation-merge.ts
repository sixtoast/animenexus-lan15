/**
 * Relation merge (API Expansion II Sprint 8).
 * AniList relations remain primary for UI targets with anilist ids.
 * AniDB edges add evidence / alternate types — never silently replace AniList links.
 */

import type { DeepRelation } from "./deep-metadata";

/** Normalized edge used by Ancestry / franchise helpers */
export type MergedRelation = {
  /** AniList media id when known */
  targetAnimeId?: number;
  /** External id when AniList unknown */
  externalTargetId?: string;
  externalTargetSource?: string;
  relationType: string;
  title?: string;
  /** Providers that attested this edge */
  sources: string[];
  confidence: number;
};

export type AniListRelationLike = {
  id: number;
  title: string;
  relationType: string;
  format?: string;
  status?: string;
  image?: string;
};

function normType(t: string): string {
  return t.trim().toLowerCase().replace(/[\s_]+/g, " ");
}

/** Map common AniDB relation labels toward AniList-ish vocabulary. */
export function normalizeRelationType(raw: string): string {
  const t = normType(raw);
  const map: Record<string, string> = {
    sequel: "SEQUEL",
    prequel: "PREQUEL",
    "side story": "SIDE_STORY",
    sidestory: "SIDE_STORY",
    "parent story": "PARENT",
    parent: "PARENT",
    summary: "SUMMARY",
    "alternative setting": "ALTERNATIVE",
    "alternative version": "ALTERNATIVE",
    "full story": "FULL_STORY",
    other: "OTHER",
    "same setting": "OTHER",
  };
  if (map[t]) return map[t];
  if (t.includes("sequel")) return "SEQUEL";
  if (t.includes("prequel")) return "PREQUEL";
  return raw.toUpperCase().replace(/\s+/g, "_") || "OTHER";
}

export function mergeRelations(
  anilist: AniListRelationLike[],
  anidb: DeepRelation[],
): MergedRelation[] {
  const out: MergedRelation[] = [];

  for (const r of anilist) {
    out.push({
      targetAnimeId: r.id,
      relationType: normalizeRelationType(r.relationType),
      title: r.title,
      sources: ["anilist"],
      confidence: 1,
    });
  }

  for (const r of anidb) {
    const type = normalizeRelationType(r.relationType);
    // If AniList already has same type + same anilist target, just add source
    if (r.targetAnimeId) {
      const existing = out.find(
        (e) =>
          e.targetAnimeId === r.targetAnimeId &&
          normType(e.relationType) === normType(type),
      );
      if (existing) {
        if (!existing.sources.includes("anidb")) existing.sources.push("anidb");
        existing.confidence = Math.max(existing.confidence, r.confidence);
        continue;
      }
      out.push({
        targetAnimeId: r.targetAnimeId,
        relationType: type,
        sources: ["anidb"],
        confidence: r.confidence,
      });
      continue;
    }

    // External-only AniDB edge — keep as evidence without inventing AniList id
    out.push({
      externalTargetId: r.externalTargetId,
      externalTargetSource: r.externalTargetSource || "anidb",
      relationType: type,
      sources: ["anidb"],
      confidence: r.confidence,
    });
  }

  return out;
}

/** Relations safe to show as AniList links in Ancestry (have targetAnimeId). */
export function anilistLinkableRelations(
  merged: MergedRelation[],
): AniListRelationLike[] {
  return merged
    .filter((m) => m.targetAnimeId != null)
    .map((m) => ({
      id: m.targetAnimeId!,
      title: m.title || `Title #${m.targetAnimeId}`,
      relationType: m.relationType,
    }));
}

/** AniDB-only edges for diagnostics / future franchise resolver. */
export function anidbOnlyRelations(merged: MergedRelation[]): MergedRelation[] {
  return merged.filter(
    (m) => m.sources.includes("anidb") && m.targetAnimeId == null,
  );
}
