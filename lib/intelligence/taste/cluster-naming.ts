/**
 * Deterministic cluster labels from fingerprint dimension peaks.
 * No LLM — evidence stays on the vector.
 */

import { humanizeDimKey } from "@/lib/intelligence/items/fingerprint-similarity";
import type { FingerprintVector } from "@/lib/intelligence/items";

export function topPeakDims(
  vector: FingerprintVector,
  limit = 4,
  minAbs = 0.12,
): { key: string; value: number; high: boolean }[] {
  const rows: { key: string; value: number; high: boolean }[] = [];
  for (const [k, v] of Object.entries(vector)) {
    const d = (v ?? 0.5) - 0.5;
    if (Math.abs(d) < minAbs) continue;
    rows.push({ key: k, value: v ?? 0.5, high: d > 0 });
  }
  rows.sort((a, b) => Math.abs(b.value - 0.5) - Math.abs(a.value - 0.5));
  return rows.slice(0, limit);
}

export function nameClusterFromVector(vector: FingerprintVector): string {
  const peaks = topPeakDims(vector, 5, 0.1);
  if (!peaks.length) return "Balanced shelf texture";

  const has = (leaf: string, high = true) =>
    peaks.some(
      (p) =>
        p.key.endsWith(`.${leaf}`) &&
        (high ? p.high : !p.high) &&
        Math.abs(p.value - 0.5) >= 0.12,
    );

  if (
    has("mysteryDensity") &&
    has("slowPayoff") &&
    (has("characterFocus") || has("melancholy"))
  ) {
    return "Slow-burn character mysteries";
  }
  if (has("actionIntensity") && has("pacing") && !has("cognitiveLoad")) {
    return "High-energy progression stories";
  }
  if (has("humour") && (has("comfort") || has("accessibility"))) {
    return "Light comedy comfort";
  }
  if (has("romance") && has("relationshipFocus")) {
    return "Relationship-forward romance";
  }
  if (has("cognitiveLoad") && has("moralAmbiguity")) {
    return "Dense moral puzzles";
  }
  if (has("darkness") && has("tension")) {
    return "Dark high-tension drama";
  }
  if (has("wonder") && has("worldBuilding")) {
    return "Wonder-led world-building";
  }
  if (has("comfort") && has("characterFocus") && !has("actionIntensity")) {
    return "Quiet character comfort";
  }
  if (has("melancholy") && has("catharsis")) {
    return "Melancholy emotional payoff";
  }
  if (has("politicalComplexity") && has("worldBuilding")) {
    return "Political world systems";
  }

  const bits = peaks.slice(0, 3).map((p) => {
    const name = humanizeDimKey(p.key);
    return p.high ? name : `Low ${name.toLowerCase()}`;
  });
  return bits.join(" · ");
}
