/**
 * Unified anime experience (Multi-API Sprint 18).
 * AniList is the catalog core; every other provider is optional enrichment.
 * Callers should prefer this over direct provider imports for detail-like UIs.
 */

import { fetchAnimeDetail } from "./anilist-detail";
import { fetchAnimeById } from "./anilist";
import { identityFromAnime, type AnimeIdentity } from "./anime-identity";
import { enrichThemes, type EnrichedThemes } from "./themes-enrich";
import { enrichFromJikan, type JikanEnrichment } from "./providers/jikan";
import {
  getAnimeSchedule,
  getNextEpisode,
} from "./providers/anime-schedule";
import type { AnimeBroadcast } from "./providers/types";
import type { Anime } from "./types";
import type { AnimeTheme } from "./enrichment-types";

export type AnimeExperience = {
  anime: Anime;
  identity: AnimeIdentity;
  themes: EnrichedThemes | null;
  jikan: JikanEnrichment;
  schedule: AnimeBroadcast[];
  nextEpisode: AnimeBroadcast | null;
  /** Which optional layers returned data */
  layers: {
    themes: boolean;
    jikanEpisodes: boolean;
    jikanStaff: boolean;
    schedule: boolean;
  };
};

export type ExperienceOptions = {
  /** Skip AnimeSchedule (default false) */
  skipSchedule?: boolean;
  /** Skip Jikan (default false) */
  skipJikan?: boolean;
  /** Skip themes (default false) */
  skipThemes?: boolean;
};

/**
 * Load core AniList title + parallel soft enrichment.
 * Throws only if core catalog fails (no anime).
 */
export async function getAnimeExperience(
  anilistId: number,
  opts: ExperienceOptions = {},
): Promise<AnimeExperience | null> {
  if (!anilistId || anilistId < 1) return null;

  const anime =
    (await fetchAnimeDetail(anilistId).catch(() => null)) ||
    (await fetchAnimeById(anilistId).catch(() => null));

  if (!anime) return null;

  const identity = identityFromAnime(anime);

  const [themes, jikan, schedule] = await Promise.all([
    opts.skipThemes
      ? Promise.resolve(null)
      : enrichThemes({
          anilistId: anime.anilist_id || anime.id,
          idMal: anime.idMal,
          title: anime.title,
        }).catch(() => null),
    opts.skipJikan
      ? Promise.resolve({
          episodes: [],
          staff: [],
          characters: [],
        } satisfies JikanEnrichment)
      : enrichFromJikan(anime.idMal).catch(() => ({
          episodes: [],
          staff: [],
          characters: [],
        })),
    opts.skipSchedule
      ? Promise.resolve([] as AnimeBroadcast[])
      : getAnimeSchedule(identity).catch(() => [] as AnimeBroadcast[]),
  ]);

  const nextEpisode =
    opts.skipSchedule || !schedule.length
      ? null
      : (await getNextEpisode(identity).catch(() => null)) ||
        schedule.find((b) => b.subAt || b.rawAt || b.dubAt) ||
        null;

  return {
    anime,
    identity,
    themes,
    jikan,
    schedule,
    nextEpisode,
    layers: {
      themes: Boolean(
        themes &&
          (themes.openings.length ||
            themes.endings.length ||
            themes.inserts?.length),
      ),
      jikanEpisodes: jikan.episodes.length > 0,
      jikanStaff: jikan.staff.length > 0,
      schedule: schedule.length > 0,
    },
  };
}

/** Convenience: themes list only from an experience. */
export function experienceThemes(exp: AnimeExperience): AnimeTheme[] {
  return exp.themes?.themes || [];
}
