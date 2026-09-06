/**
 * Blind spots — underexposed regions with high predicted compatibility.
 * Fingerprint space, not merely unseen genre.
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  buildAnimePreferenceFingerprint,
  emptyFingerprintVector,
  fingerprintToVector,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import {
  humanizeDimKey,
  vectorSimilarity,
  WEIGHTS_BLIND_SPOT,
} from "@/lib/intelligence/items/fingerprint-similarity";
import {
  blendUserVector,
  buildUserPreferenceVector,
} from "@/lib/intelligence/preference/user-preference-vector";
import { topPeakDims } from "./cluster-naming";

export const BLIND_SPOTS_VERSION = "blind_spots_v1";

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
      "narrative.politicalComplexity": 0.85,
      "narrative.worldBuilding": 0.82,
      "narrative.moralAmbiguity": 0.7,
      "experience.cognitiveLoad": 0.72,
    },
  },
  {
    id: "quiet_comfort",
    label: "Quiet character comfort",
    vector: {
      "emotional.comfort": 0.85,
      "narrative.characterFocus": 0.78,
      "experience.actionIntensity": 0.25,
      "experience.pacing": 0.3,
      "emotional.humour": 0.55,
    },
  },
  {
    id: "dense_moral",
    label: "Dense moral puzzles",
    vector: {
      "narrative.moralAmbiguity": 0.88,
      "experience.cognitiveLoad": 0.86,
      "emotional.darkness": 0.7,
      "narrative.narrativeComplexity": 0.8,
    },
  },
  {
    id: "wonder_worlds",
    label: "Wonder-led world-building",
    vector: {
      "emotional.wonder": 0.85,
      "narrative.worldBuilding": 0.82,
      "experience.actionIntensity": 0.55,
      "emotional.hope": 0.65,
    },
  },
  {
    id: "high_energy",
    label: "High-energy progression",
    vector: {
      "experience.actionIntensity": 0.88,
      "experience.pacing": 0.8,
      "experience.cognitiveLoad": 0.35,
      "emotional.catharsis": 0.7,
    },
  },
  {
    id: "relationship_romance",
    label: "Relationship-forward romance",
    vector: {
      "emotional.romance": 0.88,
      "narrative.relationshipFocus": 0.85,
      "narrative.characterFocus": 0.75,
      "experience.actionIntensity": 0.3,
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
  entries: WatchlistEntry[],
): { level: BlindSpot["exposure"]; score: number } {
  let dot = 0;
  let n = 0;
  for (const [k, rv] of Object.entries(region)) {
    if (Math.abs((rv ?? 0.5) - 0.5) < 0.12) continue;
    const sv = shelfMean[k] ?? 0.5;
    const align = 1 - Math.abs(sv - (rv ?? 0.5));
    dot += align;
    n++;
  }
  const align = n ? dot / n : 0.5;
  let highHits = 0;
  for (const e of entries) {
    if (e.watchStatus === "dropped") continue;
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
    const s = vectorSimilarity(region, fp, WEIGHTS_BLIND_SPOT);
    if (s >= 0.62) highHits++;
  }
  const exposureRatio =
    entries.length > 0 ? highHits / Math.max(1, entries.length) : 0;
  const combined = align * 0.5 + exposureRatio * 0.5;
  if (combined < 0.28) return { level: "very_low", score: combined };
  if (combined < 0.42) return { level: "low", score: combined };
  return { level: "moderate", score: combined };
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

  const user = buildUserPreferenceVector(entries);
  const userVec = blendUserVector(user);
  const shelfMean = meanShelfVector(entries);
  const spots: BlindSpot[] = [];

  for (const proto of REGION_PROTOTYPES) {
    const region = prototypeVector(proto.vector);
    let score = 0;
    let w = 0;
    for (const [k, rv] of Object.entries(region)) {
      const target = rv ?? 0.5;
      if (Math.abs(target - 0.5) < 0.1) continue;
      const u = userVec[k] ?? 0.5;
      const weight = Math.abs(target - 0.5);
      score += (1 - Math.abs(u - target)) * weight;
      w += weight;
    }
    const compatibility = w > 0 ? score / w : 0.5;
    if (compatibility < minCompat) continue;

    const { level } = exposureLevel(shelfMean, region, entries);
    if (level === "moderate") continue;

    const peaks = topPeakDims(region, 4, 0.12);
    const why = peaks.map((p) => {
      const name = humanizeDimKey(p.key);
      return p.high ? name : `Low ${name.toLowerCase()}`;
    });

    const confidence = Math.min(
      0.88,
      0.35 +
        user.confidence * 0.35 +
        compatibility * 0.2 +
        (level === "very_low" ? 0.1 : 0.05),
    );

    let entryAnimeId: number | undefined;
    let entryTitle: string | undefined;
    if (opts?.candidates?.length) {
      let best: { id: number; title: string; s: number } | null = null;
      const known = new Set(entries.map((e) => e.id));
      for (const a of opts.candidates) {
        if (known.has(a.id)) continue;
        const fp = buildAnimePreferenceFingerprint(a);
        const s = vectorSimilarity(region, fp, WEIGHTS_BLIND_SPOT);
        if (!best || s > best.s) best = { id: a.id, title: a.title, s };
      }
      if (best && best.s >= 0.5) {
        entryAnimeId = best.id;
        entryTitle = best.title;
      }
    }

    spots.push({
      id: proto.id,
      label: proto.label,
      why,
      exposure: level,
      compatibility,
      confidence,
      dimensions: peaks.map((p) => p.key),
      entryAnimeId,
      entryTitle,
    });
  }

  spots.sort((a, b) => {
    const ea = a.exposure === "very_low" ? 1.2 : 1;
    const eb = b.exposure === "very_low" ? 1.2 : 1;
    return (
      b.compatibility * b.confidence * ea -
      a.compatibility * a.confidence * eb
    );
  });

  return spots.slice(0, maxSpots);
}
