/**
 * Mood candidate retrieval.
 * When AniList / Jikan / Kitsu are down: Shikimori → MAL → Simkl → TMDB → curated.
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
import {
  poolShikiMood,
  poolMalMood,
  poolSimklMood,
  poolTmdbMood,
  poolCuratedMood,
  poolStaticGenre,
  type PoolResult,
} from "./mood-fallback-pools";

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

function mapJikanRow(a: {
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
}): Anime {
  const genres = [
    ...(a.genres || []).map((g) => g.name),
    ...(a.themes || []).map((g) => g.name),
  ];
  return {
    id: a.mal_id,
    idMal: a.mal_id,
    anilist_id: 0,
    title: a.title_english || a.title || "Unknown",
    image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
    description: a.synopsis || "",
    episodes: a.episodes ?? 0,
    duration: 0,
    popularity: 0,
    score: a.score != null ? Math.round(a.score * 10) : 0,
    format: (a.type || "TV") as Anime["format"],
    status: (a.status || "FINISHED") as Anime["status"],
    year: a.year ?? "",
    genre: genres[0] || "N/A",
    tags: genres,
    source: "jikan",
  } as Anime;
}

async function poolJikanGenreId(
  genreId: number,
  limit = 25,
): Promise<{ data: Anime[]; error?: string }> {
  try {
    const url = `${JIKAN_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=${Math.min(limit, 25)}&sfw=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 },
    } as RequestInit);
    if (!res.ok) return { data: [], error: `Jikan HTTP ${res.status}` };
    const json = (await res.json()) as {
      data?: Parameters<typeof mapJikanRow>[0][];
    };
    return { data: (json.data || []).map(mapJikanRow) };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "jikan failed",
    };
  }
}

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

function absorb(
  retrieval: MoodRetrievalSource[],
  pools: Anime[],
  results: PoolResult[],
  requested = 24,
) {
  for (const r of results) {
    retrieval.push({
      source: r.source,
      requested,
      returned: r.data.length,
      error: r.error,
    });
    pools.push(...r.data);
  }
}

export async function getMoodCandidates(
  intent: ExperienceIntent,
  _session?: IntentSession | null,
  opts?: { perPool?: number },
): Promise<MoodCandidatesResult> {
  const perPool = opts?.perPool ?? 30;
  const retrieval: MoodRetrievalSource[] = [];
  const pools: Anime[] = [];
  const slug = intent.slug;

  // A) Alternate providers FIRST
  absorb(retrieval, pools, await poolShikiMood(slug), 30);
  absorb(retrieval, pools, await poolMalMood(slug), 24);
  absorb(retrieval, pools, await poolSimklMood(slug), 20);
  absorb(retrieval, pools, await poolTmdbMood(slug), 20);

  const curated = await poolCuratedMood(slug);
  absorb(retrieval, pools, [curated], curated.data.length);

  const primaryGenre =
    (intent.genreHints && intent.genreHints[0]) ||
    (MOOD_TAG_HINTS[slug] && MOOD_TAG_HINTS[slug][0]) ||
    "";
  if (primaryGenre) {
    absorb(retrieval, pools, [await poolStaticGenre(primaryGenre)], 24);
  }

  // B) Soft AniList
  const tagHints = MOOD_TAG_HINTS[slug] || [];
  if (tagHints.length) {
    const tagResults = await Promise.allSettled(
      tagHints.slice(0, 2).map((tg) => poolTag(tg, perPool)),
    );
    tagResults.forEach((r, i) => {
      const tg = tagHints[i];
      if (r.status === "fulfilled") {
        retrieval.push({
          source: `anilist-tag:${tg}`,
          requested: perPool,
          returned: r.value.data.length,
          error: r.value.error,
        });
        pools.push(...r.value.data);
      } else {
        retrieval.push({
          source: `anilist-tag:${tg}`,
          requested: perPool,
          returned: 0,
          error: String(r.reason),
        });
      }
    });
  }

  const genres = (intent.genreHints || []).slice(0, 2);
  if (genres.length) {
    const genreResults = await Promise.allSettled(
      genres.map((g) => poolGenre(g, perPool)),
    );
    genreResults.forEach((r, i) => {
      const g = genres[i];
      if (r.status === "fulfilled") {
        const kept = r.value.data.filter(
          (a) => moodMatchScore(a, intent) >= 0.2,
        );
        retrieval.push({
          source: `anilist-genre:${g}`,
          requested: perPool,
          returned: kept.length || r.value.data.length,
          error: r.value.error,
        });
        pools.push(...(kept.length ? kept : r.value.data.slice(0, 6)));
      } else {
        retrieval.push({
          source: `anilist-genre:${g}`,
          requested: perPool,
          returned: 0,
          error: String(r.reason),
        });
      }
    });
  }

  // C) Soft Jikan
  const jikanIds = MOOD_JIKAN_GENRES[slug] || [];
  if (jikanIds.length) {
    const jkResults = await Promise.all(
      jikanIds.slice(0, 2).map((gid) => poolJikanGenreId(gid, 20)),
    );
    jkResults.forEach((r, i) => {
      retrieval.push({
        source: `jikan:genre:${jikanIds[i]}`,
        requested: 20,
        returned: r.data.length,
        error: r.error,
      });
      pools.push(...r.data);
    });
  }

  if (slug === "surprise") {
    try {
      const disc = await fetchDiscover("trending", 1, 24, "exclude");
      retrieval.push({
        source: "discover:trending",
        requested: 24,
        returned: disc.data.length,
      });
      pools.push(...disc.data);
    } catch (e) {
      retrieval.push({
        source: "discover:trending",
        requested: 24,
        returned: 0,
        error: e instanceof Error ? e.message : "discover failed",
      });
    }
  }

  const { unique, dropped } = dedupe(pools);

  const scored = unique.map((anime) => {
    const hard = moodMatchScore(anime, intent);
    let fpFit = 0.45;
    try {
      fpFit = fingerprintIntentFit(
        buildEnrichedFingerprint(anime),
        intent,
        null,
      );
    } catch {
      /* soft */
    }
    let fit = hard * 0.85 + fpFit * 0.15;
    if (anime.source === "mood-curated") fit = Math.min(1, fit + 0.2);
    if (String(anime.source || "").includes("shiki") || anime.id > 20_000_000)
      fit = Math.min(1, fit + 0.05);
    return { anime, fit, hard };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.hard - a.hard) > 0.04) return b.hard - a.hard;
    return b.fit - a.fit;
  });

  let final = scored;
  const strong = scored.filter((s) => s.hard >= 0.25);
  if (strong.length >= 10) final = strong;
  else {
    const mid = scored.filter((s) => s.hard >= 0.12);
    if (mid.length >= 8) final = mid;
  }
  final = final.slice(0, 48);

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
