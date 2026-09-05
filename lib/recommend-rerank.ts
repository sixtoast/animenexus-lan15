/**
 * Reranker V1 (R5) — diversity, fatigue, franchise de-dupe, exploration budget.
 * Takes scored candidates and produces the final short list order.
 */

import type { Anime, WatchlistEntry } from "./types";
import type { RankedRecommendation } from "./recommend-rank";
import {
  buildFatigueProfile,
  fatigueForAnime,
  fatigueScoreFactor,
  type FatigueProfile,
} from "./taste-fatigue";

export const RERANKER_VERSION = "reranker_v1";

function primaryGenre(anime: Anime): string {
  return (anime.tags?.[0] || anime.format || "unknown").toLowerCase();
}

function franchiseKey(anime: Anime): string {
  const t = (anime.title || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const parts = t.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.join(" ") || String(anime.id);
}

export type RerankOptions = {
  limit?: number;
  exploitationRatio?: number;
  fatigue?: FatigueProfile;
};

/**
 * Re-order ranked list for diversity / fatigue / novelty slots.
 */
export function rerankRecommendations(
  ranked: RankedRecommendation[],
  entries: WatchlistEntry[],
  opts?: RerankOptions,
): RankedRecommendation[] {
  if (ranked.length <= 2) return ranked;

  const fatigue = opts?.fatigue ?? buildFatigueProfile(entries);
  const limit = opts?.limit ?? ranked.length;
  const exploitRatio = opts?.exploitationRatio ?? 0.75;

  const adjusted = ranked.map((r) => {
    const f = fatigueForAnime(r.anime, fatigue);
    const factor = fatigueScoreFactor(f);
    if (factor >= 0.99) return r;
    const score = Math.max(0, Math.min(1, r.score * factor));
    const reasons =
      f >= 0.55 && r.reasons.length < 4
        ? [
            ...r.reasons,
            "Slightly cooled — you've seen a lot of this texture lately",
          ].slice(0, 4)
        : r.reasons;
    return { ...r, score, reasons };
  });
  adjusted.sort((a, b) => b.score - a.score);

  const picked: RankedRecommendation[] = [];
  const rest = [...adjusted];
  const genreCounts = new Map<string, number>();
  const franchiseCounts = new Map<string, number>();

  const maxPerGenre = 3;
  const maxPerFranchise = 1;

  while (rest.length && picked.length < limit) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < rest.length; i++) {
      const r = rest[i];
      const g = primaryGenre(r.anime);
      const fr = franchiseKey(r.anime);
      const gc = genreCounts.get(g) || 0;
      const fc = franchiseCounts.get(fr) || 0;
      let penalty = 0;
      if (gc >= maxPerGenre) penalty += 0.2;
      else if (gc >= 2) penalty += 0.08;
      if (fc >= maxPerFranchise) penalty += 0.25;
      const posBias = picked.length < 5 ? 0 : 0.02 * Math.min(gc, 3);
      const s = r.score - penalty - posBias;
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    const [chosen] = rest.splice(bestIdx, 1);
    const g = primaryGenre(chosen.anime);
    const fr = franchiseKey(chosen.anime);
    genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    franchiseCounts.set(fr, (franchiseCounts.get(fr) || 0) + 1);
    picked.push(chosen);
  }

  if (picked.length >= 8) {
    const coreN = Math.max(5, Math.floor(picked.length * exploitRatio));
    const core = picked.slice(0, coreN);
    const pool = adjusted.filter(
      (r) => !core.some((c) => c.anime.id === r.anime.id),
    );
    const mid = pool[Math.floor(pool.length * 0.25)];
    const tail = pool[Math.floor(pool.length * 0.7)];
    const out = [...core];
    if (mid && !out.some((x) => x.anime.id === mid.anime.id)) {
      out.splice(Math.min(5, out.length), 0, {
        ...mid,
        reasons: [...mid.reasons, "Adjacent exploration"].slice(0, 4),
      });
    }
    if (tail && !out.some((x) => x.anime.id === tail.anime.id)) {
      out.splice(Math.min(7, out.length), 0, {
        ...tail,
        confidence: "exploratory",
        reasons: [
          ...tail.reasons,
          "Exploration slot — outside the densest part of your shelf",
        ].slice(0, 4),
      });
    }
    for (const r of picked) {
      if (!out.some((x) => x.anime.id === r.anime.id)) out.push(r);
    }
    return out.slice(0, limit);
  }

  return picked;
}
