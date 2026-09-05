/**
 * Recommendation attribution (R1 / Sprint 3).
 * Mint ids when a ranked set is produced; pass through BehaviourTracker.
 */

export type RankerVersion = {
  candidateGeneratorVersion?: string;
  rankerVersion?: string;
  rerankerVersion?: string;
  intentVersion?: string;
};

const LAST_KEY = "anime_nexus_last_rec_set_v1";

export function mintRecommendationId(): string {
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export type RecommendationSetMeta = {
  recommendationId: string;
  at: string;
  animeIds: number[];
  source?: string;
  versions?: RankerVersion;
};

/** Remember last set in sessionStorage for outcome linking (soft). */
export function rememberRecommendationSet(meta: RecommendationSetMeta): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify(meta));
  } catch {
    /* */
  }
}

export function readLastRecommendationSet(): RecommendationSetMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RecommendationSetMeta;
  } catch {
    return null;
  }
}

/** Attach attribution when logging outcomes from detail / watchlist if same title was in last set. */
export function recommendationIdForAnime(animeId: number): string | undefined {
  const last = readLastRecommendationSet();
  if (!last?.animeIds?.includes(animeId)) return undefined;
  return last.recommendationId;
}
