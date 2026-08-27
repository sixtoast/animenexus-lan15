/**
 * Manga source adapter (API Expansion II Sprint 27).
 * Resolves SOURCE / ADAPTATION manga linked from anime relations.
 */

import type { AnimeRelation } from "./types";
import type { MangaSourceLink, MangaSummary } from "./manga-types";
import { fetchAniListManga } from "./providers/manga-anilist";
import { fetchJikanManga } from "./providers/manga-jikan";

const SOURCE_TYPES = new Set([
  "SOURCE",
  "ADAPTATION",
  "ALTERNATIVE",
  "PARENT",
  "SIDE_STORY",
]);

/** Prefer AniList manga media when relation id is AniList; soft-fail. */
export async function resolveMangaByAniListId(
  id: number,
): Promise<MangaSummary | null> {
  const al = await fetchAniListManga(id);
  if (al) return al;
  return null;
}

export async function resolveMangaByMalId(
  malId: number,
): Promise<MangaSummary | null> {
  return fetchJikanManga(malId);
}

/**
 * From anime relations, pull likely manga sources (SOURCE / ADAPTATION…).
 * AniList relation ids are Media ids — attempt MANGA type fetch.
 */
export async function resolveMangaSourcesFromRelations(
  relations: AnimeRelation[],
  opts?: { limit?: number },
): Promise<MangaSourceLink[]> {
  const limit = opts?.limit ?? 4;
  const candidates = relations.filter((r) =>
    SOURCE_TYPES.has(String(r.relationType || "").toUpperCase()),
  );
  const out: MangaSourceLink[] = [];

  for (const r of candidates) {
    if (out.length >= limit) break;
    if (!r.id) continue;
    const manga = await resolveMangaByAniListId(r.id);
    if (!manga) continue;
    out.push({ relationType: r.relationType, manga });
  }

  return out;
}
