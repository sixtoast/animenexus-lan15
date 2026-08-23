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

/** Episode list — titles only when Jikan provides them. */
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

/** Parallel soft enrichment — empty arrays on any failure. */
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
