/**
 * Rich single-title fetch (studios, trailer, characters, relations + recommendations).
 * Relations soft-fall back to Kitsu when AniList GraphQL is unavailable.
 * Recommendation chains soft-fall back to Shikimori similar / Jikan.
 */

import type { Anime, AnimeRelation } from "./types";
import { ANILIST_ENDPOINT } from "./anilist";
import { kitsuRelations } from "./providers/kitsu";
import { shikiSimilar } from "./providers/shikimori";

// PLACEHOLDER - will be replaced with full content via follow-up if this is incomplete
export async function fetchAnimeDetail(id: number): Promise<Anime | null> {
  return null;
}

export async function fetchMediaLinks(id: number): Promise<{ relations: AnimeRelation[]; recommendations: AnimeRelation[] }> {
  return { relations: [], recommendations: [] };
}

export async function fetchAnimeWithLinks(id: number): Promise<{
  anime: Anime | null;
  relations: AnimeRelation[];
  recommendations: AnimeRelation[];
}> {
  return { anime: null, relations: [], recommendations: [] };
}
