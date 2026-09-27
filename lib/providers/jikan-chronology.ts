/**
 * Secondary chronology enrichment for franchise/watch-order views.
 *
 * Jikan exposes MyAnimeList's aired date range and related metadata. It is
 * deliberately used as evidence, not as a replacement for AniList's
 * relationship graph.
 */

export type JikanChronology = {
  malId: number;
  airedFrom?: string | null;
  airedTo?: string | null;
  title?: string;
  source: "jikan";
};

type JikanAnimeResponse = {
  data?: {
    mal_id?: number;
    title?: string;
    aired?: {
      from?: string | null;
      to?: string | null;
    };
  };
};

const CACHE = new Map<number, { at: number; value: JikanChronology | null }>();
const TTL = 10 * 60 * 1000;

export async function fetchJikanChronology(
  malId: number,
): Promise<JikanChronology | null> {
  if (!Number.isInteger(malId) || malId <= 0) return null;

  const cached = CACHE.get(malId);
  if (cached && Date.now() - cached.at < TTL) return cached.value;

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/full`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      CACHE.set(malId, { at: Date.now(), value: null });
      return null;
    }

    const json = (await res.json()) as JikanAnimeResponse;
    const data = json.data;
    if (!data?.mal_id) {
      CACHE.set(malId, { at: Date.now(), value: null });
      return null;
    }

    const value: JikanChronology = {
      malId: data.mal_id,
      airedFrom: data.aired?.from ?? null,
      airedTo: data.aired?.to ?? null,
      title: data.title,
      source: "jikan",
    };
    CACHE.set(malId, { at: Date.now(), value });
    return value;
  } catch {
    CACHE.set(malId, { at: Date.now(), value: null });
    return null;
  }
}

export async function enrichJikanChronology<T extends { idMal?: number | null }>(
  nodes: T[],
  limit = 36,
): Promise<Map<number, JikanChronology>> {
  const candidates = nodes
    .filter((n): n is T & { idMal: number } => Number.isInteger(n.idMal) && Number(n.idMal) > 0)
    .slice(0, limit);

  const results = await Promise.all(
    candidates.map(async (node) => {
      const value = await fetchJikanChronology(node.idMal);
      return value ? [node.idMal, value] as const : null;
    }),
  );

  return new Map(results.filter((x): x is readonly [number, JikanChronology] => Boolean(x)));
}
