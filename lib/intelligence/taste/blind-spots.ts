/**
 * Blind spots — underexposed regions with high predicted compatibility.
 * Prefers catalogue-derived clusters; falls back to fixed prototypes.
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  buildAnimePreferenceFingerprint,
  catalogueSize,
  emptyFingerprintVector,
  fingerprintToVector,
  getCatalogueEntry,
  nearestFingerprints,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import {
  humanizeDimKey,
  vectorSimilarity,
  WEIGHTS_BLIND_SPOT,
  WEIGHTS_LONG_TERM,
} from "@/lib/intelligence/items/fingerprint-similarity";
import {
  blendUserVector,
  buildUserPreferenceVector,
} from "@/lib/intelligence/preference/user-preference-vector";
import { topPeakDims } from "./cluster-naming";

export const BLIND_SPOTS_VERSION = "blind_spots_v2";

export type BlindSpot = {
  id: string;
  label: string;
  why: string[];
  exposure: "very_low" | "low" | "moderate";
  compatibility: number;
  confidence: number;
  dimensions: string[];
  entryAnimeId?: number;
  entryTitle?: string;
  source?: "catalogue" | "prototype";
};

function meanShelfVector(entries: WatchlistEntry[]): FingerprintVector {
  const acc = emptyFingerprintVector();
  const counts: Record<string, number> = {};
  let n = 0;
  for (const e of entries) {
    if (
      e.watchStatus !== "completed" &&
      e.watchStatus !== "watching" &&
      e.watchStatus !== "planning"
    ) {
      continue;
    }
    n++;
    const fp = buildAnimePreferenceFingerprint({
      id: e.id,
      title: e.title,
      description: "",
      genre: (e.genres || e.tags || [])[0] || "",
      tags: e.genres || e.tags || [],
      status: "FINISHED",
      format: (e.format as never) || "TV",
      year: e.year || "",
      score: e.score || 0,
      popularity: 0,
      image: e.image,
      anilist_id: e.id,
      episodes: e.episodes ?? "",
      duration: e.duration || 24,
    });
    const v = fingerprintToVector(fp);
    for (const [k, val] of Object.entries(v)) {
      acc[k] = (acc[k] ?? 0) + val;
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  if (n === 0) return emptyFingerprintVector();
  for (const k of Object.keys(acc)) {
    acc[k] = counts[k] ? acc[k]! / counts[k]! : 0.5;
  }
  return acc;
}

const REGION_PROTOTYPES: {
  id: string;
  label: string;
  vector: Partial<FingerprintVector>;
}[] = [
  {
    id: "slow_mystery",
    label: "Slow-burn mysteries",
    vector: {
      "narrative.mysteryDensity": 0.88,
      "narrative.slowPayoff": 0.82,
      "narrative.characterFocus": 0.72,
      "experience.pacing": 0.32,
      "experience.cognitiveLoad": 0.7,
    },
  },
  {
    id: "political_worlds",
    label: "Political world systems",
    vector: {
      "narrative.politicalComplexity": 0.9,
      "narrative.worldBuilding": 0.8,
      "experience.cognitiveLoad": 0.75,
      "emotional.wonder": 0.4,
    },
  },
  {
    id: "quiet_comfort",
    label: "Quiet character comfort",
    vector: {
      "emotional.comfort": 0.9,
      "experience.pacing": 0.28,
      "experience.actionIntensity": 0.2,
      "narrative.characterFocus": 0.8,
    },
  },
  {
    id: "moral_puzzles",
    label: "Dense moral puzzles",
    vector: {
      "narrative.moralAmbiguity": 0.88,
      "narrative.narrativeComplexity": 0.85,
      "experience.cognitiveLoad": 0.82,
      "emotional.darkness": 0.65,
    },
  },
  {
    id: "wonder_worlds",
    label: "Wonder-led world-building",
    vector: {
      "emotional.wonder": 0.88,
      "narrative.worldBuilding": 0.85,
      "style.atmosphere": 0.75,
    },
  },
  {
    id: "high_energy",
    label: "High-energy progression",
    vector: {
      "experience.actionIntensity": 0.88,
      "experience.pacing": 0.8,
      "emotional.catharsis": 0.7,
    },
  },
  {
    id: "relationship_forward",
    label: "Relationship-forward romance",
    vector: {
      "narrative.relationshipFocus": 0.9,
      "emotional.romance": 0.85,
      "narrative.characterFocus": 0.8,
    },
  },
];

function prototypeVector(
  partial: Partial<FingerprintVector>,
): FingerprintVector {
  const v = emptyFingerprintVector();
  for (const [k, val] of Object.entries(partial)) {
    if (typeof val === "number") v[k] = val;
  }
  return v;
}

function exposureLevel(
  shelfMean: FingerprintVector,
  region: FingerprintVector,
  _entries: WatchlistEntry[],
): { level: BlindSpot["exposure"]; score: number } {
  let align = 0;
  let w = 0;
  for (const [k, rv] of Object.entries(region)) {
    if (Math.abs((rv ?? 0.5) - 0.5) < 0.1) continue;
    const weight = Math.abs((rv ?? 0.5) - 0.5);
    align += (1 - Math.abs((shelfMean[k] ?? 0.5) - (rv ?? 0.5))) * weight;
    w += weight;
  }
  const base = w > 0 ? align / w : 0.5;
  const inv = 1 - base;
  if (inv >= 0.55) return { level: "very_low", score: inv };
  if (inv >= 0.4) return { level: "low", score: inv };
  return { level: "moderate", score: inv };
}

function regionLabel(vec: FingerprintVector, fallback: string): string {
  const peaks = topPeakDims(vec, 3, 0.1);
  if (!peaks.length) return fallback;
  return peaks
    .map((p) => {
      const name = humanizeDimKey(p.key);
      return p.high ? name : `Low ${name}`;
    })
    .slice(0, 2)
    .join(" · ");
}

function catalogueRegions(
  shelfMean: FingerprintVector,
  shelfIds: Set<number>,
  limit = 8,
): { id: string; label: string; vector: FingerprintVector; seedId: number }[] {
  if (catalogueSize() < 8) return [];

  const peaks = topPeakDims(shelfMean, 6, 0.08);
  const regions: {
    id: string;
    label: string;
    vector: FingerprintVector;
    seedId: number;
  }[] = [];
  const used = new Set<number>();

  for (const peak of peaks.slice(0, 5)) {
    const query = { ...shelfMean };
    query[peak.key] = peak.high ? 0.25 : 0.78;
    const hits = nearestFingerprints(query, {
      k: 6,
      excludeIds: shelfIds,
      minSimilarity: 0.32,
      weights: WEIGHTS_BLIND_SPOT,
    });
    for (const hit of hits) {
      if (used.has(hit.animeId)) continue;
      const simShelf = vectorSimilarity(
        shelfMean,
        hit.entry.fingerprint,
        WEIGHTS_LONG_TERM,
      );
      if (simShelf > 0.62) continue;
      used.add(hit.animeId);
      const vec = fingerprintToVector(hit.entry.fingerprint);
      regions.push({
        id: `cat_${hit.animeId}`,
        label: regionLabel(vec, hit.entry.title),
        vector: vec,
        seedId: hit.animeId,
      });
      if (regions.length >= limit) return regions;
      break;
    }
  }

  if (regions.length < 4) {
    const hits = nearestFingerprints(shelfMean, {
      k: 40,
      excludeIds: shelfIds,
      minSimilarity: 0.05,
      weights: WEIGHTS_LONG_TERM,
    });
    const band = hits
      .filter((h) => h.similarity >= 0.25 && h.similarity <= 0.55)
      .slice(0, 10);
    for (const hit of band) {
      if (used.has(hit.animeId)) continue;
      used.add(hit.animeId);
      const vec = fingerprintToVector(hit.entry.fingerprint);
      regions.push({
        id: `cat_${hit.animeId}`,
        label: regionLabel(vec, hit.entry.title),
        vector: vec,
        seedId: hit.animeId,
      });
      if (regions.length >= limit) break;
    }
  }

  return regions;
}

export type BlindSpotOptions = {
  candidates?: Anime[];
  maxSpots?: number;
  minCompatibility?: number;
};

export function detectBlindSpots(
  entries: WatchlistEntry[],
  opts?: BlindSpotOptions,
): BlindSpot[] {
  const maxSpots = opts?.maxSpots ?? 3;
  const minCompat = opts?.minCompatibility ?? 0.52;
  if (entries.length < 3) return [];

  const user = buildUserPreferenceVector(entries, { autoSession: false });
  const userVec = blendUserVector(user);
  const shelfMean = meanShelfVector(entries);
  const shelfIds = new Set(entries.map((e) => e.id));
  const spots: BlindSpot[] = [];

  const catRegions = catalogueRegions(shelfMean, shelfIds, 8);
  const regions: {
    id: string;
    label: string;
    vector: FingerprintVector;
    source: "catalogue" | "prototype";
    seedId?: number;
  }[] = [
    ...catRegions.map((r) => ({
      id: r.id,
      label: r.label,
      vector: r.vector,
      source: "catalogue" as const,
      seedId: r.seedId,
    })),
    ...REGION_PROTOTYPES.map((p) => ({
      id: p.id,
      label: p.label,
      vector: prototypeVector(p.vector),
      source: "prototype" as const,
    })),
  ];

  for (const region of regions) {
    let score = 0;
    let w = 0;
    for (const [k, rv] of Object.entries(region.vector)) {
      const target = rv ?? 0.5;
      if (Math.abs(target - 0.5) < 0.1) continue;
      const u = userVec[k] ?? 0.5;
      const weight = Math.abs(target - 0.5);
      score += (1 - Math.abs(u - target)) * weight;
      w += weight;
    }
    const compatibility = w > 0 ? score / w : 0.5;
    if (compatibility < minCompat) continue;

    const { level } = exposureLevel(shelfMean, region.vector, entries);
    if (level === "moderate") continue;

    const peaks = topPeakDims(region.vector, 4, 0.12);
    const why = peaks.map((p) => {
      const name = humanizeDimKey(p.key);
      return p.high ? name : `Low ${name.toLowerCase()}`;
    });

    const confidence = Math.min(
      0.9,
      0.35 +
        user.confidence * 0.3 +
        compatibility * 0.2 +
        (level === "very_low" ? 0.12 : 0.05) +
        (region.source === "catalogue" ? 0.05 : 0),
    );

    let entryAnimeId: number | undefined = region.seedId;
    let entryTitle: string | undefined;
    if (entryAnimeId) {
      const cat = getCatalogueEntry(entryAnimeId);
      entryTitle = cat?.title;
    }

    if (opts?.candidates?.length) {
      let best: { id: number; title: string; s: number } | null = null;
      const known = new Set(entries.map((e) => e.id));
      for (const a of opts.candidates) {
        if (known.has(a.id)) continue;
        const fp = buildAnimePreferenceFingerprint(a);
        const s = vectorSimilarity(region.vector, fp, WEIGHTS_BLIND_SPOT);
        if (!best || s > best.s) best = { id: a.id, title: a.title, s };
      }
      if (best && best.s >= 0.5) {
        entryAnimeId = best.id;
        entryTitle = best.title;
      }
    }

    spots.push({
      id: region.id,
      label: region.label,
      why,
      exposure: level,
      compatibility: Math.round(compatibility * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      dimensions: peaks.map((p) => p.key),
      entryAnimeId,
      entryTitle,
      source: region.source,
    });
  }

  spots.sort((a, b) => {
    const src = (x: BlindSpot) => (x.source === "catalogue" ? 1 : 0);
    if (src(b) !== src(a)) return src(b) - src(a);
    const exp = (x: BlindSpot) => (x.exposure === "very_low" ? 2 : 1);
    if (exp(b) !== exp(a)) return exp(b) - exp(a);
    return b.compatibility - a.compatibility;
  });

  const out: BlindSpot[] = [];
  const seenLabels = new Set<string>();
  for (const s of spots) {
    const key = s.label.toLowerCase().slice(0, 24);
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    out.push(s);
    if (out.length >= maxSpots) break;
  }
  return out;
}
