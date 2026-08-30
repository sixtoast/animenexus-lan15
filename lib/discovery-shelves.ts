/**
 * Underrated-for-you + blind-spot candidates (local, soft).
 */

import type { Anime, WatchlistEntry } from "./types";
import { buildTasteClusters, clusterAffinity } from "./taste-clusters";
import { rankRecommendations } from "./recommend-rank";

export function underratedForYou(
  candidates: Anime[],
  entries: WatchlistEntry[],
  limit = 6,
): Anime[] {
  if (!candidates.length || entries.length < 2) return [];
  const ranked = rankRecommendations(candidates, entries, {
    excludeIds: entries.map((e) => e.id),
  });
  // High personal score, lower global popularity proxy (score popular but not ultra-hype)
  return ranked
    .filter((r) => r.score >= 0.4)
    .sort((a, b) => {
      const popA = a.anime.score || 0;
      const popB = b.anime.score || 0;
      // Prefer mid popularity with high personal fit
      const ua = a.score * 1.2 - (popA > 85 ? 0.25 : 0);
      const ub = b.score * 1.2 - (popB > 85 ? 0.25 : 0);
      return ub - ua;
    })
    .slice(0, limit)
    .map((r) => r.anime);
}

export function blindSpotTags(entries: WatchlistEntry[]): string[] {
  const clusters = buildTasteClusters(entries);
  if (!clusters.length) return [];
  const seen = new Set<string>();
  for (const e of entries) {
    for (const g of e.genres || e.tags || []) seen.add(String(g).toLowerCase());
  }
  // Adjacent seeds not yet in shelf
  const adjacent = [
    "sports",
    "music",
    "gourmet",
    "historical",
    "mecha",
    "horror",
    "iyashikei",
  ];
  return adjacent.filter((a) => !seen.has(a)).slice(0, 4);
}

export function blindSpotPicks(
  candidates: Anime[],
  entries: WatchlistEntry[],
  limit = 6,
): { tags: string[]; items: Anime[] } {
  const tags = blindSpotTags(entries);
  if (!tags.length || !candidates.length) return { tags, items: [] };
  const exclude = new Set(entries.map((e) => e.id));
  const hits = candidates.filter((a) => {
    if (exclude.has(a.id)) return false;
    const t = (a.tags || []).map((x) => x.toLowerCase());
    return tags.some((tag) => t.some((x) => x.includes(tag)));
  });
  // Prefer ones that still touch a cluster lightly
  const clusters = buildTasteClusters(entries);
  hits.sort((a, b) => {
    const ca = clusterAffinity(clusters, a.tags).score;
    const cb = clusterAffinity(clusters, b.tags).score;
    return cb - ca;
  });
  return { tags, items: hits.slice(0, limit) };
}
