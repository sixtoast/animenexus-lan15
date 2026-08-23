/**
 * Resolve MAL ids to AniList ids (Multi-API Sprint 6).
 * Uses AniList GraphQL idMal field — no title guessing when MAL id is known.
 */

import { anilistFetch } from "./anilist";
import { CACHE_TTL, cacheKey, dedupedFetch } from "./api-cache";
import {
  identityFromMalImport,
  withMapping,
  type AnimeIdentity,
} from "./anime-identity";

/**
 * Look up AniList media by MAL id.
 * confidence 1.0 when Media found with matching idMal.
 */
export async function resolveMalToAniList(
  malId: number,
): Promise<{ anilistId: number; title?: string } | null> {
  if (!malId || malId < 1) return null;
  const key = cacheKey(["mal2al", malId]);
  return dedupedFetch(
    key,
    async () => {
      const query = `
        query ($idMal: Int) {
          Media(idMal: $idMal, type: ANIME) {
            id
            title { romaji english }
          }
        }
      `;
      try {
        const data = await anilistFetch<{
          Media: {
            id: number;
            title?: { romaji?: string; english?: string };
          } | null;
        }>(query, { idMal: malId });
        if (!data.Media?.id) return null;
        return {
          anilistId: data.Media.id,
          title:
            data.Media.title?.english ||
            data.Media.title?.romaji ||
            undefined,
        };
      } catch {
        return null;
      }
    },
    CACHE_TTL.identity,
  );
}

/**
 * Build identity for a MAL list row, resolving AniList when possible.
 */
export async function identityForMalRow(opts: {
  malId: number;
  title: string;
}): Promise<AnimeIdentity> {
  let identity = identityFromMalImport({
    malId: opts.malId,
    title: opts.title,
  });
  const resolved = await resolveMalToAniList(opts.malId);
  if (resolved) {
    identity = withMapping(identity, {
      source: "mal",
      target: "anilist",
      targetId: String(resolved.anilistId),
      confidence: 1,
      method: "anilist_field",
      timestamp: new Date().toISOString(),
    });
  }
  return identity;
}

/**
 * Resolve many MAL ids with mild concurrency (respects AniList rate-limit).
 */
export async function resolveMalIds(
  malIds: number[],
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  const unique = [...new Set(malIds.filter((id) => id > 0))];
  // Sequential under rate limiter — safer than parallel flood
  for (const malId of unique) {
    const r = await resolveMalToAniList(malId);
    if (r) map.set(malId, r.anilistId);
  }
  return map;
}
