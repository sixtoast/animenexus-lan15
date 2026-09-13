/**
 * Semantic Compare engine — fingerprint distance, shared traits, differences.
 * Genres/tags are supporting evidence only.
 */
import type { Anime } from "@/lib/types";
import type { AnimePreferenceFingerprint } from "@/lib/intelligence/items/anime-preference-fingerprint";
import { getBestAvailableFingerprint } from "@/lib/intelligence/items/resolve-fingerprint";
import {
  ALL_DIM_KEYS,
  DEFAULT_DIM_WEIGHTS,
  clamp01,
  dimConfidence,
  dimValue,
  type DimKey,
} from "./dims";

export const DIFF_SIGNIFICANCE = 0.12;
export const SHARED_HIGH = 0.68;
export const SHARED_LOW = 0.32;
export const SHARED_MIN_CONF = 0.35;

export type DimDelta = {
  key: DimKey;
  a: number;
  b: number;
  difference: number;
  absoluteDifference: number;
  weight: number;
  confidence: number;
  significant: boolean;
};

export type SharedTrait = {
  key: DimKey;
  direction: "high" | "low";
  a: number;
  b: number;
  confidence: number;
};

export type CompareResult = {
  similarity: number;
  weightedDistance: number;
  deltas: DimDelta[];
  largestDifferences: DimDelta[];
  sharedTraits: SharedTrait[];
  structure: {
    episodesA?: number;
    episodesB?: number;
    formatA?: string;
    formatB?: string;
    yearA?: string | number;
    yearB?: string | number;
  };
  community: { scoreA: number; scoreB: number; popularityGap: number };
  supporting: { sharedGenres: string[]; sharedTags: string[] };
  relation?: string | null;
  fingerprintSourceA: string;
  fingerprintSourceB: string;
  confidenceA: number;
  confidenceB: number;
  nexusIdA: string;
  nexusIdB: string;
};

export function compareFingerprints(
  fpA: AnimePreferenceFingerprint,
  fpB: AnimePreferenceFingerprint,
  opts?: {
    animeA?: Anime | null;
    animeB?: Anime | null;
    sourceA?: string;
    sourceB?: string;
    nexusIdA?: string;
    nexusIdB?: string;
  },
): CompareResult {
  const keys = ALL_DIM_KEYS;
  let num = 0;
  let den = 0;
  const deltas: DimDelta[] = [];

  for (const key of keys) {
    const a = dimValue(fpA, key);
    const b = dimValue(fpB, key);
    const difference = a - b;
    const absoluteDifference = Math.abs(difference);
    const conf = Math.min(dimConfidence(fpA, key), dimConfidence(fpB, key));
    const weight = DEFAULT_DIM_WEIGHTS[key] ?? 1;
    num += weight * absoluteDifference * conf;
    den += weight * conf;
    deltas.push({
      key,
      a,
      b,
      difference,
      absoluteDifference,
      weight,
      confidence: conf,
      significant:
        conf >= SHARED_MIN_CONF && absoluteDifference >= DIFF_SIGNIFICANCE,
    });
  }

  const weightedDistance = den > 0 ? num / den : 0.5;
  const similarity = clamp01(1 - weightedDistance);

  const largestDifferences = deltas
    .filter((d) => d.significant)
    .sort((x, y) => y.absoluteDifference - x.absoluteDifference)
    .slice(0, 8);

  const sharedTraits: SharedTrait[] = [];
  for (const d of deltas) {
    if (d.confidence < SHARED_MIN_CONF) continue;
    if (d.a >= SHARED_HIGH && d.b >= SHARED_HIGH) {
      sharedTraits.push({
        key: d.key,
        direction: "high",
        a: d.a,
        b: d.b,
        confidence: d.confidence,
      });
    } else if (d.a <= SHARED_LOW && d.b <= SHARED_LOW) {
      sharedTraits.push({
        key: d.key,
        direction: "low",
        a: d.a,
        b: d.b,
        confidence: d.confidence,
      });
    }
  }
  sharedTraits.sort((x, y) => y.confidence - x.confidence);

  const genresA = new Set(
    (opts?.animeA?.tags || []).map((t) => t.toLowerCase()),
  );
  const sharedGenres = (opts?.animeB?.tags || [])
    .map((t) => t.toLowerCase())
    .filter((g) => genresA.has(g));

  let relation: string | null = null;
  const rels = opts?.animeA?.relations || [];
  if (opts?.animeB && rels.length) {
    const hit = rels.find((r) => r.id === opts.animeB!.id);
    if (hit) relation = hit.relationType || "RELATED";
  }

  return {
    similarity,
    weightedDistance,
    deltas,
    largestDifferences,
    sharedTraits: sharedTraits.slice(0, 10),
    structure: {
      episodesA: fpA.structure?.episodeCount,
      episodesB: fpB.structure?.episodeCount,
      formatA: fpA.structure?.format || opts?.animeA?.format,
      formatB: fpB.structure?.format || opts?.animeB?.format,
      yearA: opts?.animeA?.year,
      yearB: opts?.animeB?.year,
    },
    community: {
      scoreA: opts?.animeA?.score || 0,
      scoreB: opts?.animeB?.score || 0,
      popularityGap: 0,
    },
    supporting: {
      sharedGenres: sharedGenres.slice(0, 12),
      sharedTags: sharedGenres.slice(0, 12),
    },
    relation,
    fingerprintSourceA: opts?.sourceA || "local_fallback",
    fingerprintSourceB: opts?.sourceB || "local_fallback",
    confidenceA: fpA.confidence?.overall ?? 0.4,
    confidenceB: fpB.confidence?.overall ?? 0.4,
    nexusIdA: opts?.nexusIdA || `anilist:${fpA.animeId}`,
    nexusIdB: opts?.nexusIdB || `anilist:${fpB.animeId}`,
  };
}

export function compareAnime(a: Anime, b: Anime): CompareResult {
  const ra = getBestAvailableFingerprint(a);
  const rb = getBestAvailableFingerprint(b);
  return compareFingerprints(ra.fingerprint, rb.fingerprint, {
    animeA: a,
    animeB: b,
    sourceA: ra.source,
    sourceB: rb.source,
    nexusIdA: ra.nexusId,
    nexusIdB: rb.nexusId,
  });
}

export function fitToUserVector(
  fp: AnimePreferenceFingerprint,
  userVec: Record<string, number>,
): number {
  let num = 0;
  let den = 0;
  for (const key of ALL_DIM_KEYS) {
    const u = userVec[key];
    if (typeof u !== "number") continue;
    const v = dimValue(fp, key);
    const w = DEFAULT_DIM_WEIGHTS[key] ?? 1;
    num += w * Math.abs(v - u);
    den += w;
  }
  if (den <= 0) return 0.5;
  return clamp01(1 - num / den);
}
