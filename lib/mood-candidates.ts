/**
 * Mood candidate retrieval.
 * When AniList / Jikan / Kitsu are down: Shikimori → MAL → Simkl → TMDB → curated.
 * Offline curated/static can be disabled via resolveMoodOfflineSeed.
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
import {
  resolveMoodOfflineSeed,
  offlineSeedDisabledReason,
} from "./mood-offline-seed";

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
  offlineSeedEnabled: boolean;
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
    const url = `${JIKAN_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=${Math.min(limit, 25)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    } as RequestInit);
    if (!res.ok) return { data: [], error: `Jikan HTTP ${res.status}` };
    const json = (await res.json()) as { data?: Parameters<typeof mapJikanRow>[0][] };
    return { data: (json.data || []).map(mapJikanRow) };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "jikan genre failed",
    };
  }
}

async function poolTag(
  tag: string,
  limit = 30,
): Promise<{ data: Anime[]; error?: string }> {
  try {
    const page = await fetchFiltered(
      { tag, sort: "score", adultFilter: "exclude" },
      1,
      limit,
    );
    return { data: page.data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "anilist tag failed",
    };
  }
}

async function poolGenre(
  genre: string,
  limit = 30,
): Promise<{ data: Anime[]; error?: string }> {
  try {
    const page = await fetchFiltered(
      { genre, sort: "score", adultFilter: "exclude" },
      1,
      limit,
    );
    return { data: page.data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "anilist genre failed",
    };
  }
}

function dedupeAnime(list: Anime[]): { unique: Anime[]; dropped: number } {
  const byNexus = new Map<string, Anime>();
  let dropped = 0;
  for (const a of list) {
    const id = ensureNexusId(identityFromAnime(a));
    const key = id.nexusId || `id:${a.id}`;
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
  opts?: { perPool?: number; allowOfflineSeed?: boolean },
): Promise<MoodCandidatesResult> {
  const perPool = opts?.perPool ?? 30;
  const offlineSeedEnabled = resolveMoodOfflineSeed(opts?.allowOfflineSeed);
  const retrieval: MoodRetrievalSource[] = [];
  const pools: Anime[] = [];
  const slug = intent.slug;

  // A) Alternate providers FIRST
  absorb(retrieval, pools, await poolShikiMood(slug), 30);
  absorb(retrieval, pools, await poolMalMood(slug), 24);
  absorb(retrieval, pools, await poolSimklMood(slug), 20);
  absorb(retrieval, pools, await poolTmdbMood(slug), 20);

  if (offlineSeedEnabled) {
    const curated = await poolCuratedMood(slug);
    absorb(retrieval, pools, [curated], curated.data.length);

    const primaryGenre =
      (intent.genreHints && intent.genreHints[0]) ||
      (MOOD_TAG_HINTS[slug] && MOOD_TAG_HINTS[slug][0]) ||
      "";
    if (primaryGenre) {
      absorb(retrieval, pools, [await poolStaticGenre(primaryGenre)], 24);
    }
  } else {
    retrieval.push({
      source: "curated:disabled",
      requested: 0,
      returned: 0,
      error: offlineSeedDisabledReason(),
    });
    retrieval.push({
      source: "static:disabled",
      requested: 0,
      returned: 0,
      error: offlineSeedDisabledReason(),
    });
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
          returned: kept.length,
          error: r.value.error,
        });
        pools.push(...kept);
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

  // C) Soft Jikan genre ids
  const jikanIds = MOOD_JIKAN_GENRES[slug] || [];
  if (jikanIds.length) {
    const jikanResults = await Promise.allSettled(
      jikanIds.slice(0, 2).map((gid) => poolJikanGenreId(gid, 20)),
    );
    jikanResults.forEach((r, i) => {
      const gid = jikanIds[i];
      if (r.status === "fulfilled") {
        retrieval.push({
          source: `jikan:genre:${gid}`,
          requested: 20,
          returned: r.value.data.length,
          error: r.value.error,
        });
        pools.push(...r.value.data);
      } else {
        retrieval.push({
          source: `jikan:genre:${gid}`,
          requested: 20,
          returned: 0,
          error: String(r.reason),
        });
      }
    });
  }

  // Soft discover if still thin
  if (pools.length < 8) {
    try {
      const page = await fetchDiscover("top", 1, 24, "exclude");
      retrieval.push({
        source: "discover:top",
        requested: 24,
        returned: page.data.length,
      });
      pools.push(...page.data);
    } catch (e) {
      retrieval.push({
        source: "discover:top",
        requested: 24,
        returned: 0,
        error: e instanceof Error ? e.message : "discover failed",
      });
    }
  }

  const { unique, dropped } = dedupeAnime(pools);

  // Rank by intent fingerprint fit when possible
  const scored = unique.map((anime) => {
    try {
      const fp = buildEnrichedFingerprint(anime);
      const fit = fingerprintIntentFit(fp, intent);
      const match = moodMatchScore(anime, intent);
      return { anime, score: fit * 0.7 + match * 0.3 };
    } catch {
      return { anime, score: moodMatchScore(anime, intent) };
    }
  });
  scored.sort((a, b) => b.score - a.score);

  const candidates: MoodCandidate[] = scored.map(({ anime }) => ({
    identity: ensureNexusId(identityFromAnime(anime)),
    anime,
  }));

  return {
    candidates,
    retrieval,
    dedupeCount: dropped,
    offlineSeedEnabled,
  };
}

export async function getMoodCandidatesBySlug(
  slug: string,
  session?: IntentSession | null,
  opts?: { allowOfflineSeed?: boolean },
): Promise<MoodCandidatesResult> {
  const intent = getExperienceIntent(slug);
  if (!intent) {
    return {
      candidates: [],
      retrieval: [],
      dedupeCount: 0,
      offlineSeedEnabled: resolveMoodOfflineSeed(opts?.allowOfflineSeed),
    };
  }
  return getMoodCandidates(intent, session, opts);
}
