/**
 * Archive Field — spatial watchlist map (not a shelf).
 * Every sealed title is a node. Layout is derived, never stored.
 */

import type { WatchStatus, WatchlistEntry } from "./types";
import {
  cosineSimilarity,
  interactionWeight,
  resonanceFromGenres,
  userResonance,
} from "./resonance";

export type FieldLayoutMode = "orbit" | "constellation" | "timeline";

export type FieldNode = {
  id: number;
  title: string;
  image: string;
  status: WatchStatus;
  weight: number;
  progress: number;
  progressRatio: number;
  userRating: number;
  genres: string[];
  addedAt: string;
  x: number;
  y: number;
  z: number;
  seed: number;
};

const STATUS_RING: Record<WatchStatus, number> = {
  watching: 0.22,
  planning: 0.38,
  paused: 0.52,
  completed: 0.66,
  dropped: 0.82,
};

const STATUS_ORDER: WatchStatus[] = [
  "watching",
  "planning",
  "paused",
  "completed",
  "dropped",
];

export const FIELD_STATUS_LABELS: Record<WatchStatus, string> = {
  watching: "In motion",
  planning: "Horizon",
  paused: "Suspended",
  completed: "Settled",
  dropped: "Drifted",
};

export const FIELD_STATUS_COLORS: Record<WatchStatus, string> = {
  watching: "#f0a090",
  planning: "#7eb8ff",
  paused: "#c9a227",
  completed: "#7dcea0",
  dropped: "#9a8b82",
};

function seed(id: number): number {
  const x = Math.sin(id * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function episodeCap(e: WatchlistEntry): number {
  const n =
    typeof e.episodes === "number"
      ? e.episodes
      : parseInt(String(e.episodes || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

function nodeWeight(e: WatchlistEntry, userSim: number): number {
  let w = 0.3 * interactionWeight(e) + 0.35 * userSim;
  if (e.userRating > 0) w += 0.15 * (e.userRating / 10);
  if (e.watchStatus === "watching") w += 0.12;
  if (e.watchStatus === "completed") w += 0.06;
  return Math.max(0.12, Math.min(1, w));
}

function layoutOrbit(entries: WatchlistEntry[]): FieldNode[] {
  const user = userResonance(entries);
  const byStatus: Record<WatchStatus, WatchlistEntry[]> = {
    watching: [],
    planning: [],
    paused: [],
    completed: [],
    dropped: [],
  };
  for (const e of entries) byStatus[e.watchStatus].push(e);

  const out: FieldNode[] = [];
  for (const status of STATUS_ORDER) {
    const list = byStatus[status].slice().sort((a, b) => {
      const wa = nodeWeight(
        a,
        cosineSimilarity(user, resonanceFromGenres(a.genres)),
      );
      const wb = nodeWeight(
        b,
        cosineSimilarity(user, resonanceFromGenres(b.genres)),
      );
      return wb - wa;
    });
    const n = list.length;
    const radius = STATUS_RING[status] * 420;
    list.forEach((e, i) => {
      const s = seed(e.id);
      const angle = (i / Math.max(n, 1)) * Math.PI * 2 + s * 0.35;
      const rJitter = radius * (0.92 + s * 0.16);
      const cx = 500 + Math.cos(angle) * rJitter;
      const cy = 500 + Math.sin(angle) * rJitter * 0.88;
      const statusZ: Record<WatchStatus, number> = {
        watching: 80,
        planning: 20,
        paused: -20,
        completed: -60,
        dropped: -120,
      };
      const z = (statusZ[status] ?? 0) + (s - 0.5) * 40;
      const cap = episodeCap(e);
      const sim = cosineSimilarity(user, resonanceFromGenres(e.genres));
      out.push({
        id: e.id,
        title: e.title,
        image: e.image || "",
        status,
        weight: nodeWeight(e, sim),
        progress: e.progress || 0,
        progressRatio: Math.min(1, (e.progress || 0) / cap),
        userRating: e.userRating || 0,
        genres: e.genres || [],
        addedAt: e.addedAt,
        x: cx,
        y: cy,
        z,
        seed: s,
      });
    });
  }
  return out;
}

function layoutConstellation(entries: WatchlistEntry[]): FieldNode[] {
  const user = userResonance(entries);
  const buckets = new Map<string, WatchlistEntry[]>();
  for (const e of entries) {
    const key = (e.genres && e.genres[0]) || e.watchStatus;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(e);
  }
  const keys = [...buckets.keys()].sort();
  const out: FieldNode[] = [];
  keys.forEach((key, bi) => {
    const list = buckets.get(key)!;
    const angle0 = (bi / Math.max(keys.length, 1)) * Math.PI * 2;
    const clusterR = 140 + Math.min(220, list.length * 10);
    const cx0 = 500 + Math.cos(angle0) * 340;
    const cy0 = 500 + Math.sin(angle0) * 300;
    list.forEach((e, i) => {
      const s = seed(e.id);
      const a = (i / Math.max(list.length, 1)) * Math.PI * 2 + s;
      const rr = 28 + (i % 7) * 14 + s * 20;
      const cap = episodeCap(e);
      const sim = cosineSimilarity(user, resonanceFromGenres(e.genres));
      out.push({
        id: e.id,
        title: e.title,
        image: e.image || "",
        status: e.watchStatus,
        weight: nodeWeight(e, sim),
        progress: e.progress || 0,
        progressRatio: Math.min(1, (e.progress || 0) / cap),
        userRating: e.userRating || 0,
        genres: e.genres || [],
        addedAt: e.addedAt,
        x: cx0 + Math.cos(a) * Math.min(clusterR, rr * 2.2),
        y: cy0 + Math.sin(a) * Math.min(clusterR, rr * 2),
        z: (bi - keys.length / 2) * 45 + (s - 0.5) * 90 + Math.sin(a) * 40,
        seed: s,
      });
    });
  });
  return out;
}

function layoutTimeline(entries: WatchlistEntry[]): FieldNode[] {
  const user = userResonance(entries);
  const sorted = entries.slice().sort((a, b) => {
    const ta = Date.parse(a.addedAt) || 0;
    const tb = Date.parse(b.addedAt) || 0;
    return ta - tb;
  });
  const out: FieldNode[] = [];
  sorted.forEach((e, i) => {
    const s = seed(e.id);
    const t = i / Math.max(sorted.length - 1, 1);
    const angle = t * Math.PI * 8 + s * 0.4;
    const radius = 60 + t * 320;
    const cap = episodeCap(e);
    const sim = cosineSimilarity(user, resonanceFromGenres(e.genres));
    out.push({
      id: e.id,
      title: e.title,
      image: e.image || "",
      status: e.watchStatus,
      weight: nodeWeight(e, sim),
      progress: e.progress || 0,
      progressRatio: Math.min(1, (e.progress || 0) / cap),
      userRating: e.userRating || 0,
      genres: e.genres || [],
      addedAt: e.addedAt,
      x: 500 + Math.cos(angle) * radius,
      y: 500 + Math.sin(angle) * radius * 0.9,
      z: (t - 0.5) * 520 + (s - 0.5) * 30,
      seed: s,
    });
  });
  return out;
}

export function projectFieldNodes(
  entries: WatchlistEntry[],
  mode: FieldLayoutMode = "orbit",
): FieldNode[] {
  if (!entries.length) return [];
  if (mode === "constellation") return layoutConstellation(entries);
  if (mode === "timeline") return layoutTimeline(entries);
  return layoutOrbit(entries);
}

export function countByStatus(
  entries: WatchlistEntry[],
): Record<WatchStatus, number> {
  const c: Record<WatchStatus, number> = {
    watching: 0,
    planning: 0,
    paused: 0,
    completed: 0,
    dropped: 0,
  };
  for (const e of entries) c[e.watchStatus]++;
  return c;
}

/** Map field 0–1000 coords to Three.js world units. */
export function fieldToWorld(n: {
  x: number;
  y: number;
  z: number;
}): [number, number, number] {
  return [(n.x - 500) / 85, (500 - n.y) / 85, (n.z || 0) / 85];
}
