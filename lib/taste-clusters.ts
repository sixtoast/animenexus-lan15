/**
 * Multi-interest taste clusters — users are not one vector.
 * Built from watchlist + implicit behaviour weighted genres/tags.
 */

import type { WatchlistEntry } from "./types";
import { affinityForAnime, recentEvents } from "./behaviour-events";

export type TasteCluster = {
  id: string;
  label: string;
  /** genre/tag → 0–1 strength within this cluster */
  dims: Record<string, number>;
  weight: number;
  evidence: number;
};

const SEED_CLUSTERS: { id: string; label: string; seeds: string[] }[] = [
  {
    id: "cerebral",
    label: "Psychological / cerebral",
    seeds: ["psychological", "mystery", "thriller", "sci-fi", "mecha"],
  },
  {
    id: "emotional",
    label: "Emotional character drama",
    seeds: ["drama", "romance", "slice of life"],
  },
  {
    id: "chaotic",
    label: "Chaotic comedy",
    seeds: ["comedy", "parody"],
  },
  {
    id: "spectacle",
    label: "Action / spectacle",
    seeds: ["action", "adventure", "sports", "fantasy"],
  },
  {
    id: "dark",
    label: "Dark / intense",
    seeds: ["horror", "supernatural", "suspense"],
  },
];

function statusWeight(status: string): number {
  switch (status) {
    case "completed":
      return 7;
    case "watching":
      return 5;
    case "rewatching":
      return 10;
    case "plan_to_watch":
    case "planning":
      return 3;
    case "dropped":
      return -2;
    default:
      return 1;
  }
}

/** Build up to N interest clusters from shelf + behaviour. */
export function buildTasteClusters(
  entries: WatchlistEntry[],
  maxClusters = 4,
): TasteCluster[] {
  const tagScores: Record<string, number> = {};

  for (const e of entries) {
    const w =
      statusWeight(String(e.watchStatus || "")) +
      (e.id ? Math.max(0, affinityForAnime(e.id)) * 0.15 : 0);
    for (const g of e.genres || e.tags || []) {
      const key = String(g).toLowerCase();
      tagScores[key] = (tagScores[key] || 0) + w;
    }
  }

  // Boost from recent positive behaviours touching known titles
  for (const ev of recentEvents(90)) {
    if (!ev.animeId || ev.weight <= 0) continue;
    const entry = entries.find((x) => x.id === ev.animeId);
    if (!entry) continue;
    for (const g of entry.genres || entry.tags || []) {
      const key = String(g).toLowerCase();
      tagScores[key] = (tagScores[key] || 0) + ev.weight * 0.2;
    }
  }

  const clusters: TasteCluster[] = [];
  for (const seed of SEED_CLUSTERS) {
    const dims: Record<string, number> = {};
    let evidence = 0;
    for (const s of seed.seeds) {
      const score = tagScores[s] || 0;
      if (score > 0) {
        dims[s] = score;
        evidence += score;
      }
    }
    if (evidence < 2) continue;
    const max = Math.max(...Object.values(dims), 1);
    for (const k of Object.keys(dims)) dims[k] = dims[k] / max;
    clusters.push({
      id: seed.id,
      label: seed.label,
      dims,
      weight: evidence,
      evidence,
    });
  }

  clusters.sort((a, b) => b.weight - a.weight);
  const top = clusters.slice(0, maxClusters);
  const sum = top.reduce((s, c) => s + c.weight, 0) || 1;
  return top.map((c) => ({ ...c, weight: c.weight / sum }));
}

/** Score an anime against multi-cluster profile (max cluster affinity). */
export function clusterAffinity(
  clusters: TasteCluster[],
  tags: string[] | undefined,
): { score: number; clusterId?: string; label?: string } {
  if (!clusters.length || !tags?.length) return { score: 0.4 };
  const lower = tags.map((t) => t.toLowerCase());
  let best = 0;
  let bestC: TasteCluster | undefined;
  for (const c of clusters) {
    let hit = 0;
    let n = 0;
    for (const [dim, w] of Object.entries(c.dims)) {
      n += w;
      if (lower.some((t) => t.includes(dim) || dim.includes(t))) hit += w;
    }
    const s = (n > 0 ? hit / n : 0) * c.weight;
    if (s > best) {
      best = s;
      bestC = c;
    }
  }
  return {
    score: Math.min(1, best * 1.4),
    clusterId: bestC?.id,
    label: bestC?.label,
  };
}
