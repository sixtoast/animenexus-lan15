/**
 * AnimeSchedule.net adapter (Multi-API Sprint 10).
 * Requires server env ANIMESCHEDULE_API_KEY (Bearer from account API app).
 * Soft-fail when missing or on network errors — never blocks Detail.
 *
 * Docs: https://animeschedule.net/api/v3/documentation
 */

import type { AnimeIdentity } from "../anime-identity";
import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";
import type { AnimeBroadcast } from "./types";

const BASE = "https://animeschedule.net/api/v3";

function apiKey(): string | undefined {
  return process.env.ANIMESCHEDULE_API_KEY?.trim() || undefined;
}

export function isAnimeScheduleConfigured(): boolean {
  return Boolean(apiKey());
}

async function scheduleFetch<T>(path: string): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;

  return withProviderLimit("animeschedule", async () => {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 120 },
    } as RequestInit);
    if (res.status === 401 || res.status === 403) {
      console.warn("[animeschedule] unauthorized — check ANIMESCHEDULE_API_KEY");
      return null;
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`AnimeSchedule HTTP ${res.status}`);
    return (await res.json()) as T;
  });
}

type TimetableEpisode = {
  episode?: number;
  airingDate?: string;
  delayed?: boolean;
  streams?: { platform?: string; url?: string }[];
};

type AnimeScheduleAnime = {
  id?: string;
  title?: string;
  routes?: string[];
  episodes?: TimetableEpisode[];
  status?: string;
};

function toBroadcasts(raw: AnimeScheduleAnime, source = "animeschedule"): AnimeBroadcast[] {
  const eps = raw.episodes || [];
  return eps.map((ep) => ({
    episode: ep.episode,
    subAt: ep.airingDate,
    delayed: Boolean(ep.delayed),
    streamingServices: (ep.streams || [])
      .map((s) => s.platform)
      .filter(Boolean) as string[],
    source,
  }));
}

/**
 * Resolve schedule by AniList id when the API supports external id search.
 * Falls back to empty if key missing or no match.
 */
export async function getAnimeSchedule(
  identity: AnimeIdentity,
): Promise<AnimeBroadcast[]> {
  if (!isAnimeScheduleConfigured()) return [];
  const al = identity.anilistId;
  if (!al) return [];

  const key = cacheKey(["as", "schedule", al]);
  return dedupedFetch(
    key,
    async () => {
      try {
        // Common pattern: search anime then read timetable — endpoint shapes vary by API app scope
        const search = await scheduleFetch<{
          anime?: AnimeScheduleAnime[];
          data?: AnimeScheduleAnime[];
        }>(`/anime?anilist-id=${al}&page=1`);

        const list = search?.anime || search?.data || [];
        const first = list[0];
        if (!first?.id && !first?.routes?.[0]) {
          // Try MAL id
          if (identity.malId) {
            const byMal = await scheduleFetch<{
              anime?: AnimeScheduleAnime[];
              data?: AnimeScheduleAnime[];
            }>(`/anime?mal-id=${identity.malId}&page=1`);
            const m = byMal?.anime?.[0] || byMal?.data?.[0];
            if (m) return toBroadcasts(m);
          }
          return [];
        }

        // Prefer embedded episodes; else fetch by route slug
        if (first.episodes?.length) return toBroadcasts(first);

        const route = first.routes?.[0] || first.id;
        if (!route) return [];
        const detail = await scheduleFetch<AnimeScheduleAnime>(`/anime/${route}`);
        if (!detail) return [];
        return toBroadcasts(detail);
      } catch (e) {
        console.warn(
          "[animeschedule] schedule failed",
          e instanceof Error ? e.message : e,
        );
        return [];
      }
    },
    CACHE_TTL.short,
  );
}

export async function getNextEpisode(
  identity: AnimeIdentity,
): Promise<AnimeBroadcast | null> {
  const all = await getAnimeSchedule(identity);
  if (!all.length) return null;
  const now = Date.now();
  const upcoming = all
    .filter((b) => b.subAt && new Date(b.subAt).getTime() >= now - 3600_000)
    .sort(
      (a, b) =>
        new Date(a.subAt || 0).getTime() - new Date(b.subAt || 0).getTime(),
    );
  return upcoming[0] || all[all.length - 1] || null;
}

/** Placeholder for authenticated user timetable (needs OAuth scope). */
export async function getUserSchedule(): Promise<AnimeBroadcast[]> {
  if (!isAnimeScheduleConfigured()) return [];
  // User-specific lists require OAuth — not configured in this sprint
  return [];
}
