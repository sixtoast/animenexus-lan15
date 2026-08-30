/**
 * Drop signatures — aversion dimensions from repeated drops.
 * One drop is noise; patterns with evidence become soft ranking penalties.
 */

import type { WatchlistEntry } from "./types";

export type DropSignature = {
  dimension: string;
  kind: "genre" | "format" | "length";
  strength: number;
  confidence: number;
  evidenceCount: number;
};

function lengthBucket(episodes: number | string | undefined): string | null {
  const n =
    typeof episodes === "number"
      ? episodes
      : parseInt(String(episodes || ""), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 13) return "short_series";
  if (n <= 26) return "standard_cours";
  if (n <= 50) return "long_series";
  return "very_long_series";
}

/** Infer aversions from dropped shelf entries (min evidence). */
export function buildDropSignatures(
  entries: WatchlistEntry[],
  minEvidence = 3,
): DropSignature[] {
  const dropped = entries.filter((e) => e.watchStatus === "dropped");
  if (dropped.length < 2) return [];

  const genreCounts: Record<string, number> = {};
  const formatCounts: Record<string, number> = {};
  const lengthCounts: Record<string, number> = {};

  for (const e of dropped) {
    for (const g of e.genres || e.tags || []) {
      const k = String(g).toLowerCase();
      genreCounts[k] = (genreCounts[k] || 0) + 1;
    }
    if (e.format) {
      const f = String(e.format).toLowerCase();
      formatCounts[f] = (formatCounts[f] || 0) + 1;
    }
    const lb = lengthBucket(e.episodes);
    if (lb) lengthCounts[lb] = (lengthCounts[lb] || 0) + 1;
  }

  // Baseline: how often these appear on full shelf
  const shelfGenre: Record<string, number> = {};
  for (const e of entries) {
    for (const g of e.genres || e.tags || []) {
      const k = String(g).toLowerCase();
      shelfGenre[k] = (shelfGenre[k] || 0) + 1;
    }
  }

  const sigs: DropSignature[] = [];

  for (const [dim, count] of Object.entries(genreCounts)) {
    if (count < minEvidence) continue;
    const shelf = shelfGenre[dim] || count;
    const dropRate = count / Math.max(1, shelf);
    if (dropRate < 0.35 && count < minEvidence + 1) continue;
    const strength = Math.min(1, 0.35 + dropRate * 0.5 + count * 0.05);
    const confidence = Math.min(1, 0.3 + count * 0.12);
    if (confidence < 0.45) continue;
    sigs.push({
      dimension: dim,
      kind: "genre",
      strength,
      confidence,
      evidenceCount: count,
    });
  }

  for (const [dim, count] of Object.entries(formatCounts)) {
    if (count < minEvidence) continue;
    sigs.push({
      dimension: dim,
      kind: "format",
      strength: Math.min(1, 0.4 + count * 0.1),
      confidence: Math.min(1, 0.35 + count * 0.12),
      evidenceCount: count,
    });
  }

  for (const [dim, count] of Object.entries(lengthCounts)) {
    if (count < minEvidence) continue;
    if (dim !== "long_series" && dim !== "very_long_series") continue;
    sigs.push({
      dimension: dim,
      kind: "length",
      strength: Math.min(1, 0.4 + count * 0.1),
      confidence: Math.min(1, 0.35 + count * 0.12),
      evidenceCount: count,
    });
  }

  sigs.sort((a, b) => b.confidence * b.strength - a.confidence * a.strength);
  return sigs.slice(0, 8);
}

/** Soft penalty 0–0.25 for ranking. */
export function dropPenalty(
  signatures: DropSignature[],
  tags: string[] | undefined,
  format?: string,
  episodes?: number | string,
): { penalty: number; reasons: string[] } {
  if (!signatures.length) return { penalty: 0, reasons: [] };
  const lower = (tags || []).map((t) => t.toLowerCase());
  const fmt = (format || "").toLowerCase();
  const lb = lengthBucket(episodes);
  let penalty = 0;
  const reasons: string[] = [];

  for (const s of signatures) {
    let hit = false;
    if (s.kind === "genre" && lower.some((t) => t.includes(s.dimension)))
      hit = true;
    if (s.kind === "format" && fmt.includes(s.dimension)) hit = true;
    if (s.kind === "length" && lb === s.dimension) hit = true;
    if (!hit) continue;
    const p = 0.08 * s.strength * s.confidence;
    penalty += p;
    if (reasons.length < 2) {
      reasons.push(
        `Soft aversion: you've dropped several ${s.dimension.replace(/_/g, " ")} titles`,
      );
    }
  }

  return { penalty: Math.min(0.25, penalty), reasons };
}
