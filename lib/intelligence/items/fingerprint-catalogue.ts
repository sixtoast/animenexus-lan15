/**
 * Fingerprint catalogue / nearest-neighbour index.
 * Local-first: memory + optional localStorage.
 * Used by candidate generation so retrieval is not only AniList genre queries.
 */

import type { Anime } from "@/lib/types";
import {
  FINGERPRINT_VERSION,
  fingerprintToVector,
  type AnimePreferenceFingerprint,
  type FingerprintVector,
} from "./anime-preference-fingerprint";
import {
  buildAnimePreferenceFingerprint,
  type BuildFingerprintOptions,
} from "./fingerprint-builder";
import { buildEnrichedFingerprint } from "./fingerprint-enrichment";
import {
  cosineWeighted,
  vectorSimilarity,
  WEIGHTS_LONG_TERM,
  type FingerprintSimilarityWeights,
} from "./fingerprint-similarity";

export type CatalogueEntry = {
  animeId: number;
  fingerprint: AnimePreferenceFingerprint;
  title: string;
  tags: string[];
  image?: string;
  genre?: string;
  score?: number;
  format?: string;
  indexedAt: number;
};

export type NearestHit = {
  animeId: number;
  similarity: number;
  entry: CatalogueEntry;
};

const LS_KEY = `an_fp_catalogue_${FINGERPRINT_VERSION}`;
const MAX_PERSIST = 400;

const mem = new Map<number, CatalogueEntry>();
let hydrated = false;

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as CatalogueEntry[];
    if (!Array.isArray(list)) return;
    for (const e of list) {
      if (!e?.animeId || !e.fingerprint) continue;
      if (e.fingerprint.version !== FINGERPRINT_VERSION) continue;
      mem.set(e.animeId, e);
    }
  } catch {
    /* soft */
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    const list = [...mem.values()]
      .sort((a, b) => b.indexedAt - a.indexedAt)
      .slice(0, MAX_PERSIST);
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function catalogueSize(): number {
  hydrate();
  return mem.size;
}

export function getCatalogueEntry(id: number): CatalogueEntry | null {
  hydrate();
  return mem.get(id) ?? null;
}

export function indexFingerprint(
  anime: Anime,
  fp?: AnimePreferenceFingerprint,
  opts?: BuildFingerprintOptions,
): CatalogueEntry {
  hydrate();
  const fingerprint =
    fp ||
    buildEnrichedFingerprint(anime, opts) ||
    buildAnimePreferenceFingerprint(anime, opts);

  const entry: CatalogueEntry = {
    animeId: anime.id,
    fingerprint,
    title: anime.title || "Untitled",
    tags: [
      ...(anime.tags || []),
      ...(anime.genre ? [String(anime.genre)] : []),
    ].filter(Boolean),
    image: anime.image,
    genre: anime.genre ? String(anime.genre) : undefined,
    score: typeof anime.score === "number" ? anime.score : undefined,
    format: anime.format ? String(anime.format) : undefined,
    indexedAt: Date.now(),
  };
  mem.set(anime.id, entry);
  return entry;
}

export function indexAnimeList(
  list: Anime[],
  fps?: Map<number, AnimePreferenceFingerprint>,
): number {
  let n = 0;
  for (const a of list) {
    if (!a?.id) continue;
    indexFingerprint(a, fps?.get(a.id));
    n++;
  }
  if (n > 0) persist();
  return n;
}

export function entryToAnime(e: CatalogueEntry): Anime {
  return {
    id: e.animeId,
    title: e.title,
    description: "",
    genre: e.genre || e.tags[0] || "",
    tags: e.tags,
    status: "FINISHED",
    format: (e.format as Anime["format"]) || "TV",
    year: "?",
    score: e.score ?? 0,
    popularity: 0,
    image: e.image || "",
    anilist_id: e.animeId,
    episodes: "?",
    duration: 24,
  };
}

/** Brute-force nearest neighbours (fine for hundreds of entries). */
export function nearestFingerprints(
  query: AnimePreferenceFingerprint | FingerprintVector,
  opts?: {
    k?: number;
    excludeIds?: Set<number> | number[];
    minSimilarity?: number;
    weights?: FingerprintSimilarityWeights;
  },
): NearestHit[] {
  hydrate();
  const k = opts?.k ?? 24;
  const minSim = opts?.minSimilarity ?? 0.35;
  const weights = opts?.weights ?? WEIGHTS_LONG_TERM;
  const exclude = new Set(
    opts?.excludeIds
      ? Array.isArray(opts.excludeIds)
        ? opts.excludeIds
        : [...opts.excludeIds]
      : [],
  );

  const isFp = (q: typeof query): q is AnimePreferenceFingerprint =>
    typeof (q as AnimePreferenceFingerprint).animeId === "number" &&
    !!(q as AnimePreferenceFingerprint).emotional;

  const hits: NearestHit[] = [];
  for (const entry of mem.values()) {
    if (exclude.has(entry.animeId)) continue;
    let sim: number;
    if (isFp(query)) {
      sim = vectorSimilarity(
        fingerprintToVector(query),
        entry.fingerprint,
        weights,
      );
    } else {
      sim =
        (cosineWeighted(
          query,
          fingerprintToVector(entry.fingerprint),
          weights,
        ) +
          1) /
        2;
    }
    if (sim < minSim) continue;
    hits.push({ animeId: entry.animeId, similarity: sim, entry });
  }

  hits.sort((a, b) => b.similarity - a.similarity);
  return hits.slice(0, k);
}

export function catalogueCoverageStats(): {
  size: number;
  avgConfidence: number;
  rich: number;
  medium: number;
  fallback: number;
} {
  hydrate();
  let sum = 0;
  let rich = 0;
  let medium = 0;
  let fallback = 0;
  for (const e of mem.values()) {
    const c = e.fingerprint.confidence.overall;
    sum += c;
    if (c >= 0.65) rich++;
    else if (c >= 0.4) medium++;
    else fallback++;
  }
  const size = mem.size;
  return {
    size,
    avgConfidence: size ? sum / size : 0,
    rich,
    medium,
    fallback,
  };
}

export function clearCatalogue(): void {
  mem.clear();
  hydrated = true;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* soft */
    }
  }
}
