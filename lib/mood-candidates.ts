/**
 * Mood candidate retrieval + hard mood ranking.
 */
import type { Anime } from "./types";
import { fetchDiscover, fetchFiltered } from "./anilist";
import {
  getExperienceIntent,
  fingerprintIntentFit,
  type ExperienceIntent,
} from "./viewing-intent";
import { buildEnrichedFingerprint } from "./intelligence/items";
import type { IntentSession } from "./intent-session";
import { identityFromAnime, ensureNexusId } from "./anime-identity";
import { JIKAN_BASE } from "./api";
import {
  MOOD_TAG_HINTS,
  MOOD_JIKAN_GENRES,
  moodMatchScore,
} from "./mood-match";

export type MoodRetrievalSource = {
  source: string;
  requested: number;
  returned: number;
  error?: string;
};

export type MoodCandidate = {
  identity: ReturnType<typeof ensureNexusId>;
  anime: Anime;
};

export type MoodCandidatesResult = {
  candidates: MoodCandidate[];
  retrieval: MoodRetrievalSource[];
  dedupeCount: number;
};

export { moodMatchScore, MOOD_TAG_HINTS };

async function poolGenre(genre: string, perPage: number) {
  try {
    const page = await fetchFiltered(
      { genre, sort: "score", adultFilter: "exclude" },
      1,
      perPage,
    );
    return { data: page.data as Anime[] };
  } catch (e) {
    return {
      data: [] as Anime[],
      error: e instanceof Error ? e.message : "genre failed",
    };
  }
}

async function poolTag(tag: string, perPage: number) {
  try {
    const page = await fetchFiltered(
      { tag, sort: "score", adultFilter: "exclude" },
      1,
      perPage,
    );
    return { data: page.data as Anime[] };
  } catch (e) {
    return {
      data: [] as Anime[],
      error: e instanceof Error ? e.message : "tag failed",
    };
  }
}

async function poolJikanGenres(genreIds: number[], perPage: number) {
  if (!genreIds.length) return { data: [] as Anime[] };
  try {
    const ids = genreIds.slice(0, 2).join(",");
    const url = `${JIKAN_BASE}/anime?genres=${ids}&order_by=score&sort=desc&limit=${Math.min(perPage, 25)}&sfw=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) {
      return { data: [] as Anime[], error: `Jikan HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      data?: Array<{
        mal_id: number;
        title?: string;
        title_english?: string | null;
        images?: { jpg?: { large_image_url?: string; image_url?: string } };
        score?: number | null;
        episodes?: number | null;
        type?: string | null;
        genres?: { name: string }[];
        themes?: { name: string }[];
        synopsis?: string | null;
        year?: number | null;
        status?: string | null;
      }>;
    };
    const data: Anime[] = (json.data || []).map((a) => {
      const genres = [
        ...(a.genres || []).map((g) => g.name),
        ...(a.themes || []).map((g) => g.name),
      ];
      return {
        id: a.mal_id + 20_000_000,
        idMal: a.mal_id,
        anilist_id: 0,
        title: a.title || a.title_english || "Unknown",
        image:
          a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
        description: a.synopsis || "",
        episodes: a.episodes ?? 0,
        duration: 0,
        popularity: 0,
        score: a.score != null ? a.score * 10 : 0,
        format: (a.type || "TV") as Anime["format"],
        status: (a.status || "FINISHED") as Anime["status"],
        year: a.year ?? "",
        genre: genres[0] || "N/A",
        tags: genres,
        source: "jikan",
      } as Anime;
    });
    return { data };
  } catch (e) {
    return {
      data: [] as Anime[],
      error: e instanceof Error ? e.message : "jikan failed",
    };
  }
}

function dedupe(animes: Anime[]) {
  const byNexus = new Map<string, Anime>();
  let dropped = 0;
  for (const a of animes) {
    const id = ensureNexusId(identityFromAnime(a));
    const key =
      id.anilistId != null && id.anilistId > 0
        ? `anilist:${id.anilistId}`
        : id.malId != null && id.malId > 0
          ? `mal:${id.malId}`
          : id.nexusId || `raw:${a.id}`;
    if (byNexus.has(key)) {
      dropped++;
      continue;
    }
    byNexus.set(key, a);
  }
  return { unique: [...byNexus.values()], dropped };
}

export async function getMoodCandidates(
  intent: ExperienceIntent,
  _session?: IntentSession | null,
  opts?: { perPool?: number },
): Promise<MoodCandidatesResult> {
  const perPool = opts?.perPool ?? 40;
  const retrieval: MoodRetrievalSource[] = [];
  const tagAnimes: Anime[] = [];
  const genreAnimes: Anime[] = [];
  const jikanAnimes: Anime[] = [];

  const tagHints = MOOD_TAG_HINTS[intent.slug] || [];
  const tagResults = await Promise.allSettled(
    tagHints.slice(0, 3).map((tg) => poolTag(tg, Math.max(perPool, 40))),
  );
  tagResults.forEach((r, i) => {
    const tg = tagHints[i];
    if (r.status === "fulfilled") {
      retrieval.push({
        source: `tag:${tg}`,
        requested: Math.max(perPool, 40),
        returned: r.value.data.length,
        error: r.value.error,
      });
      tagAnimes.push(...r.value.data);
    } else {
      retrieval.push({
        source: `tag:${tg}`,
        requested: Math.max(perPool, 40),
        returned: 0,
        error: String(r.reason),
      });
    }
  });

  const genres = (intent.genreHints || []).slice(0, 3);
  const genreResults = await Promise.allSettled(
    genres.map((g) => poolGenre(g, perPool)),
  );
  genreResults.forEach((r, i) => {
    const g = genres[i];
    if (r.status === "fulfilled") {
      retrieval.push({
        source: `genre:${g}`,
        requested: perPool,
        returned: r.value.data.length,
        error: r.value.error,
      });
      genreAnimes.push(...r.value.data);
    } else {
      retrieval.push({
        source: `genre:${g}`,
        requested: perPool,
        returned: 0,
        error: String(r.reason),
      });
    }
  });

  const jikanIds = MOOD_JIKAN_GENRES[intent.slug] || [];
  if (jikanIds.length) {
    const jk = await poolJikanGenres(jikanIds, 25);
    retrieval.push({
      source: `jikan:genres:${jikanIds.slice(0, 2).join(",")}`,
      requested: 25,
      returned: jk.data.length,
      error: (jk as { error?: string }).error,
    });
    jikanAnimes.push(...jk.data);
  }

  let { unique, dropped } = dedupe([
    ...tagAnimes,
    ...genreAnimes,
    ...jikanAnimes,
  ]);

  if (unique.length < 12) {
    try {
      const quality = await fetchDiscover("top", 1, 12, "exclude");
      retrieval.push({
        source: "quality:top-emergency",
        requested: 12,
        returned: quality.data.length,
      });
      ({ unique, dropped } = dedupe([...unique, ...quality.data]));
    } catch (e) {
      retrieval.push({
        source: "quality:top-emergency",
        requested: 12,
        returned: 0,
        error: e instanceof Error ? e.message : "quality failed",
      });
    }
  }

  const tagIds = new Set(tagAnimes.map((a) => a.id));
  const jikanIdSet = new Set(jikanAnimes.map((a) => a.id));

  const scored = unique.map((anime) => {
    const hard = moodMatchScore(anime, intent);
    let fpFit = 0.5;
    try {
      fpFit = fingerprintIntentFit(
        buildEnrichedFingerprint(anime),
        intent,
        null,
      );
    } catch {
      /* soft */
    }
    let fit = hard * 0.7 + fpFit * 0.3;
    if (tagIds.has(anime.id)) fit = Math.min(1, fit + 0.1);
    if (jikanIdSet.has(anime.id)) fit = Math.min(1, fit + 0.06);
    return { anime, fit, hard };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.hard - a.hard) > 0.05) return b.hard - a.hard;
    return b.fit - a.fit;
  });

  let final = scored;
  const strong = scored.filter((s) => s.hard >= 0.25);
  if (strong.length >= 16) final = strong;
  else if (scored.filter((s) => s.hard >= 0.15).length >= 12) {
    final = scored.filter((s) => s.hard >= 0.15);
  }

  return {
    candidates: final.map(({ anime }) => ({
      identity: ensureNexusId(identityFromAnime(anime)),
      anime,
    })),
    retrieval,
    dedupeCount: dropped,
  };
}

export async function getMoodCandidatesBySlug(
  slug: string,
  session?: IntentSession | null,
): Promise<MoodCandidatesResult> {
  const intent = getExperienceIntent(slug);
  if (!intent) return { candidates: [], retrieval: [], dedupeCount: 0 };
  return getMoodCandidates(intent, session);
}
