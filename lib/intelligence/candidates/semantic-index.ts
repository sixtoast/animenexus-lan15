/**
 * Cached semantic-neighbour search over existing fingerprints.
 * Uses the same distance semantics as compareFingerprints (weighted dims).
 * Only indexes fingerprints above MIN_SEMANTIC_INDEX_CONFIDENCE.
 */
import type { AnimePreferenceFingerprint } from "@/lib/intelligence/items/anime-preference-fingerprint";
import {
  compareFingerprints,
  type CompareResult,
} from "@/lib/intelligence/semantic-ops/compare";
import {
  getCachedFingerprintByKey,
  setCachedFingerprintByKey,
} from "@/lib/intelligence/items/fingerprint-cache";

/** Floor for index membership — weak local guesses must not dominate NN. */
export const MIN_SEMANTIC_INDEX_CONFIDENCE = 0.35;

export type SemanticIndexEntry = {
  nexusId: string;
  animeId: number;
  fingerprint: AnimePreferenceFingerprint;
  confidence: number;
  updatedAt: number;
};

type Mem = {
  entries: Map<string, SemanticIndexEntry>;
};

const g = globalThis as unknown as { __an_semantic_index?: Mem };

function store(): Mem {
  if (!g.__an_semantic_index) {
    g.__an_semantic_index = { entries: new Map() };
  }
  return g.__an_semantic_index;
}

export function indexFingerprint(
  nexusId: string,
  fingerprint: AnimePreferenceFingerprint,
): void {
  if (!nexusId || !fingerprint) return;
  const conf = fingerprint.confidence?.overall ?? 0;
  if (conf < MIN_SEMANTIC_INDEX_CONFIDENCE) return;
  store().entries.set(nexusId, {
    nexusId,
    animeId: fingerprint.animeId,
    fingerprint,
    confidence: conf,
    updatedAt: Date.now(),
  });
  try {
    setCachedFingerprintByKey(nexusId, fingerprint);
  } catch {
    /* cache optional */
  }
}

export function getIndexedFingerprint(
  nexusId: string,
): AnimePreferenceFingerprint | null {
  const hit = store().entries.get(nexusId);
  if (hit) return hit.fingerprint;
  return getCachedFingerprintByKey(nexusId);
}

export type SemanticNeighbour = {
  nexusId: string;
  animeId: number;
  fingerprint: AnimePreferenceFingerprint;
  similarity: number;
  weightedDistance: number;
  confidence: number;
};

export type FindSemanticNeighboursOpts = {
  target: AnimePreferenceFingerprint;
  limit?: number;
  excludeNexusIds?: string[];
  excludeAnimeIds?: number[];
  minConfidence?: number;
};

export function findSemanticNeighbours(
  opts: FindSemanticNeighboursOpts,
): SemanticNeighbour[] {
  const limit = opts.limit ?? 24;
  const minConf = opts.minConfidence ?? MIN_SEMANTIC_INDEX_CONFIDENCE;
  const excludeNx = new Set(opts.excludeNexusIds || []);
  const excludeId = new Set(opts.excludeAnimeIds || []);

  const out: SemanticNeighbour[] = [];
  for (const entry of store().entries.values()) {
    if (entry.confidence < minConf) continue;
    if (excludeNx.has(entry.nexusId)) continue;
    if (excludeId.has(entry.animeId)) continue;
    let cmp: CompareResult;
    try {
      cmp = compareFingerprints(opts.target, entry.fingerprint);
    } catch {
      continue;
    }
    out.push({
      nexusId: entry.nexusId,
      animeId: entry.animeId,
      fingerprint: entry.fingerprint,
      similarity: cmp.similarity,
      weightedDistance: cmp.weightedDistance,
      confidence: entry.confidence,
    });
  }

  out.sort(
    (a, b) =>
      b.similarity - a.similarity || a.weightedDistance - b.weightedDistance,
  );
  return out.slice(0, limit);
}

export function seedSemanticIndex(
  items: { nexusId: string; fingerprint: AnimePreferenceFingerprint }[],
): number {
  let n = 0;
  for (const it of items) {
    if (!it.nexusId || !it.fingerprint) continue;
    indexFingerprint(it.nexusId, it.fingerprint);
    n++;
  }
  return n;
}

export function semanticIndexSize(): number {
  return store().entries.size;
}

export function clearSemanticIndexForTests(): void {
  store().entries.clear();
}
