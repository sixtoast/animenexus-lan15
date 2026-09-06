/**
 * Taste Clusters V3 — fingerprint-dimension vectors, not genre bags.
 * Additive module; legacy taste-clusters.ts remains for current ranker.
 */

import type { WatchlistEntry } from "@/lib/types";
import {
  buildAnimePreferenceFingerprint,
  emptyFingerprintVector,
  fingerprintToVector,
  type AnimePreferenceFingerprint,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import { interactionStrength } from "@/lib/intelligence/preference/user-preference-vector";
import { nameClusterFromVector, topPeakDims } from "./cluster-naming";
import {
  vectorSimilarity,
  WEIGHTS_LONG_TERM,
} from "@/lib/intelligence/items/fingerprint-similarity";

export const TASTE_CLUSTERS_VERSION = "clusters_v3";

export type ClusterState = "stable" | "emerging" | "declining" | "dormant";

export type TasteClusterV3 = {
  id: string;
  label: string;
  vector: FingerprintVector;
  strength: number;
  confidence: number;
  evidenceAnimeIds: number[];
  representativeTitles: number[];
  state: ClusterState;
  firstSeen: number;
  lastActive: number;
  /** Genre labels for human readability only — not the cluster identity */
  genreHints: string[];
};

function entryToFp(
  e: WatchlistEntry,
  fps?: Map<number, AnimePreferenceFingerprint>,
): AnimePreferenceFingerprint {
  const hit = fps?.get(e.id);
  if (hit) return hit;
  return buildAnimePreferenceFingerprint({
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
}

function weightedMean(
  items: { vec: FingerprintVector; w: number }[],
): FingerprintVector {
  const out = emptyFingerprintVector();
  const sums: Record<string, number> = {};
  const ws: Record<string, number> = {};
  for (const { vec, w } of items) {
    if (w <= 0) continue;
    for (const [k, v] of Object.entries(vec)) {
      sums[k] = (sums[k] || 0) + (v - 0.5) * w;
      ws[k] = (ws[k] || 0) + w;
    }
  }
  for (const k of Object.keys(out)) {
    const w = ws[k] || 0;
    out[k] = w > 0 ? Math.max(0, Math.min(1, 0.5 + sums[k]! / w)) : 0.5;
  }
  return out;
}

function cosineSimple(a: FingerprintVector, b: FingerprintVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = (a[k] ?? 0.5) - 0.5;
    const bv = (b[k] ?? 0.5) - 0.5;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na < 1e-8 || nb < 1e-8) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Greedy clustering of shelf fingerprints.
 * Each entry joins nearest cluster above threshold, else seeds a new one.
 */
export function buildTasteClustersV3(
  entries: WatchlistEntry[],
  opts?: {
    fingerprints?: Map<number, AnimePreferenceFingerprint>;
    maxClusters?: number;
    joinThreshold?: number;
  },
): TasteClusterV3[] {
  const maxClusters = opts?.maxClusters ?? 5;
  const joinThreshold = opts?.joinThreshold ?? 0.35;
  const now = Date.now();

  type Soft = {
    members: { id: number; w: number; vec: FingerprintVector; at: number }[];
    genreHints: Record<string, number>;
  };

  const soft: Soft[] = [];

  const scored = entries
    .map((e) => {
      const fp = entryToFp(e, opts?.fingerprints);
      const w = Math.max(0.05, Math.abs(interactionStrength(e)));
      const at = e.updatedAt ? new Date(e.updatedAt).getTime() : now;
      return {
        id: e.id,
        w,
        vec: fingerprintToVector(fp),
        at: Number.isFinite(at) ? at : now,
        genres: e.genres || e.tags || [],
      };
    })
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w);

  for (const item of scored) {
    let bestI = -1;
    let bestSim = -1;
    for (let i = 0; i < soft.length; i++) {
      const centroid = weightedMean(
        soft[i]!.members.map((m) => ({ vec: m.vec, w: m.w })),
      );
      const sim = cosineSimple(centroid, item.vec);
      if (sim > bestSim) {
        bestSim = sim;
        bestI = i;
      }
    }
    if (bestI >= 0 && bestSim >= joinThreshold && soft.length > 0) {
      soft[bestI]!.members.push({
        id: item.id,
        w: item.w,
        vec: item.vec,
        at: item.at,
      });
      for (const g of item.genres) {
        const k = String(g).toLowerCase();
        soft[bestI]!.genreHints[k] =
          (soft[bestI]!.genreHints[k] || 0) + item.w;
      }
    } else if (soft.length < maxClusters) {
      const hints: Record<string, number> = {};
      for (const g of item.genres) {
        hints[String(g).toLowerCase()] = item.w;
      }
      soft.push({
        members: [{ id: item.id, w: item.w, vec: item.vec, at: item.at }],
        genreHints: hints,
      });
    } else if (bestI >= 0) {
      soft[bestI]!.members.push({
        id: item.id,
        w: item.w,
        vec: item.vec,
        at: item.at,
      });
    }
  }

  const clusters: TasteClusterV3[] = soft.map((s, idx) => {
    const vector = weightedMean(s.members.map((m) => ({ vec: m.vec, w: m.w })));
    const strength = s.members.reduce((a, m) => a + m.w, 0);
    const evidence = s.members.length;
    const lastActive = Math.max(...s.members.map((m) => m.at), now);
    const firstSeen = Math.min(...s.members.map((m) => m.at), now);
    const ageDays = (now - lastActive) / (24 * 60 * 60 * 1000);

    let state: ClusterState = "stable";
    if (evidence <= 1 || strength < 0.8) state = "emerging";
    if (ageDays > 120) state = "dormant";
    else if (ageDays > 60 && strength < 2) state = "declining";

    const genreHints = Object.entries(s.genreHints)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([g]) => g);

    const confidence = Math.min(
      0.92,
      0.25 + evidence * 0.12 + Math.min(0.3, strength * 0.08),
    );

    const label = nameClusterFromVector(vector);
    const rep = [...s.members]
      .sort((a, b) => b.w - a.w)
      .slice(0, 3)
      .map((m) => m.id);

    return {
      id: `c3_${idx}_${label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 24)}`,
      label,
      vector,
      strength,
      confidence,
      evidenceAnimeIds: s.members.map((m) => m.id),
      representativeTitles: rep,
      state,
      firstSeen,
      lastActive,
      genreHints,
    };
  });

  clusters.sort(
    (a, b) => b.strength * b.confidence - a.strength * a.confidence,
  );
  return clusters;
}

export function clusterAffinityV3(
  fp: AnimePreferenceFingerprint,
  cluster: TasteClusterV3,
): number {
  return vectorSimilarity(cluster.vector, fp, WEIGHTS_LONG_TERM);
}

export function describeClusterPeaks(
  cluster: TasteClusterV3,
  limit = 5,
): string {
  return topPeakDims(cluster.vector, limit)
    .map((p) => {
      const name = p.key.includes(".") ? p.key.split(".")[1] : p.key;
      const arrow = p.high ? "\u2191" : "\u2193";
      return `${name}${arrow}`;
    })
    .join(" · ");
}
