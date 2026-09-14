/**
 * Jikan v4 enrichment (Multi-API Sprint 8).
 * Optional only — never blocks AniList Detail.
 * Uses MAL id when available.
 */

import { JIKAN_BASE } from "../api";
import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";
import type { AnimeEpisode } from "./types";

export type JikanStaffMember = {
  malId: number;
  name: string;
  roles: string[];
  image?: string;
  source: "jikan";
};

export type JikanCharacter = {
  malId: number;
  name: string;
  role: string;
  image?: string;
  source: "jikan";
};

async function jikanGet<T>(path: string): Promise<T | null> {
  return withProviderLimit("jikan", async () => {
    const res = await fetch(`${JIKAN_BASE}${path}`, {
      next: { revalidate: 3600 },
    } as RequestInit);
    if (res.status === 404) return null;
    if (res.status === 429) throw new Error("Jikan 429");
    if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
    return (await res.json()) as T;
  });
}

export async function fetchJikanEpisodes(
  malId: number,
): Promise<AnimeEpisode[]> {
  if (!malId || malId < 1) return [];
  const key = cacheKey(["jikan", "eps", malId]);
  return dedupedFetch(
    key,
    async () => {
      try {
        const out: AnimeEpisode[] = [];
        let page = 1;
        let hasNext = true;
        while (hasNext && page <= 4) {
          const json = await jikanGet<{
            data?: {
              mal_id?: number;
              title?: string;
              title_japanese?: string;
              aired?: string;
              filler?: boolean;
              recap?: boolean;
            }[];
            pagination?: { has_next_page?: boolean };
          }>(`/anime/${malId}/episodes?page=${page}`);
          if (!json?.data?.length) break;
          for (const ep of json.data) {
            const num = ep.mal_id ?? out.length + 1;
            out.push({
              number: num,
              title: ep.title || undefined,
              airedAt: ep.aired || undefined,
              source: "jikan",
            });
          }
          hasNext = Boolean(json.pagination?.has_next_page);
          page += 1;
        }
        return out;
      } catch {
        return [];
      }
    },
    CACHE_TTL.medium,
  );
}

export async function fetchJikanStaff(
  malId: number,
): Promise<JikanStaffMember[]> {
  if (!malId || malId < 1) return [];
  const key = cacheKey(["jikan", "staff", malId]);
  return dedupedFetch(
    key,
    async () => {
      try {
        const json = await jikanGet<{
          data?: {
            person?: {
              mal_id?: number;
              name?: string;
              images?: { jpg?: { image_url?: string } };
            };
            positions?: string[];
          }[];
        }>(`/anime/${malId}/staff`);
        return (json?.data || [])
          .filter((r) => r.person?.mal_id)
          .slice(0, 24)
          .map((r) => ({
            malId: r.person!.mal_id!,
            name: r.person!.name || "Unknown",
            roles: r.positions || [],
            image: r.person!.images?.jpg?.image_url,
            source: "jikan" as const,
          }));
      } catch {
        return [];
      }
    },
    CACHE_TTL.medium,
  );
}

export async function fetchJikanCharacters(
  malId: number,
): Promise<JikanCharacter[]> {
  if (!malId || malId < 1) return [];
  const key = cacheKey(["jikan", "chars", malId]);
  return dedupedFetch(
    key,
    async () => {
      try {
        const json = await jikanGet<{
          data?: {
            character?: {
              mal_id?: number;
              name?: string;
              images?: { jpg?: { image_url?: string } };
            };
            role?: string;
          }[];
        }>(`/anime/${malId}/characters`);
        return (json?.data || [])
          .filter((r) => r.character?.mal_id)
          .slice(0, 24)
          .map((r) => ({
            malId: r.character!.mal_id!,
            name: r.character!.name || "Unknown",
            role: r.role || "Supporting",
            image: r.character!.images?.jpg?.image_url,
            source: "jikan" as const,
          }));
      } catch {
        return [];
      }
    },
    CACHE_TTL.medium,
  );
}

export type JikanEnrichment = {
  episodes: AnimeEpisode[];
  staff: JikanStaffMember[];
  characters: JikanCharacter[];
};

export async function enrichFromJikan(
  malId: number | null | undefined,
): Promise<JikanEnrichment> {
  if (!malId || malId < 1) {
    return { episodes: [], staff: [], characters: [] };
  }
  const [episodes, staff, characters] = await Promise.all([
    fetchJikanEpisodes(malId),
    fetchJikanStaff(malId),
    fetchJikanCharacters(malId),
  ]);
  return { episodes, staff, characters };
}

/** Full anime row for semantic enrichment (Class A + Class B). */
export type JikanFullAnime = {
  malId: number;
  title: string;
  synopsis?: string;
  background?: string;
  genres: { name: string; malId?: number }[];
  explicitGenres: { name: string; malId?: number }[];
  themes: { name: string; malId?: number }[];
  demographics: { name: string; malId?: number }[];
  source?: string;
  type?: string;
  episodes?: number;
  duration?: string;
  status?: string;
  season?: string;
  year?: number;
  rating?: string;
  score?: number;
  scoredBy?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  studios: string[];
  producers: string[];
  licensors: string[];
};

function mapNamedList(
  arr: { name?: string; mal_id?: number }[] | undefined,
): { name: string; malId?: number }[] {
  if (!arr) return [];
  return arr
    .filter((x) => x?.name)
    .map((x) => ({ name: x.name as string, malId: x.mal_id }));
}

/** Fetch full Jikan anime for known MAL id — semantic enrichment. */
export async function fetchJikanFullAnime(
  malId: number,
): Promise<JikanFullAnime | null> {
  if (!malId || malId < 1) return null;
  const key = cacheKey(["jikan", "full", malId]);
  return dedupedFetch(
    key,
    async () => {
      try {
        const json = await jikanGet<{
          data?: {
            mal_id?: number;
            title?: string;
            synopsis?: string;
            background?: string;
            genres?: { name?: string; mal_id?: number }[];
            explicit_genres?: { name?: string; mal_id?: number }[];
            themes?: { name?: string; mal_id?: number }[];
            demographics?: { name?: string; mal_id?: number }[];
            source?: string;
            type?: string;
            episodes?: number;
            duration?: string;
            status?: string;
            season?: string;
            year?: number;
            rating?: string;
            score?: number;
            scored_by?: number;
            rank?: number;
            popularity?: number;
            members?: number;
            favorites?: number;
            studios?: { name?: string }[];
            producers?: { name?: string }[];
            licensors?: { name?: string }[];
          };
        }>(`/anime/${malId}/full`);
        const d = json?.data;
        if (!d?.mal_id) return null;
        return {
          malId: d.mal_id,
          title: d.title || "",
          synopsis: d.synopsis || undefined,
          background: d.background || undefined,
          genres: mapNamedList(d.genres),
          explicitGenres: mapNamedList(d.explicit_genres),
          themes: mapNamedList(d.themes),
          demographics: mapNamedList(d.demographics),
          source: d.source,
          type: d.type,
          episodes: d.episodes,
          duration: d.duration,
          status: d.status,
          season: d.season,
          year: d.year,
          rating: d.rating,
          score: d.score,
          scoredBy: d.scored_by,
          rank: d.rank,
          popularity: d.popularity,
          members: d.members,
          favorites: d.favorites,
          studios: (d.studios || [])
            .map((s) => s.name)
            .filter(Boolean) as string[],
          producers: (d.producers || [])
            .map((s) => s.name)
            .filter(Boolean) as string[],
          licensors: (d.licensors || [])
            .map((s) => s.name)
            .filter(Boolean) as string[],
        };
      } catch {
        return null;
      }
    },
    CACHE_TTL.medium,
  );
}
