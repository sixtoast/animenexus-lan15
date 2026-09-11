/**
 * Mood candidate retrieval — genre-specific pools first, hard mood ranking.
 * Never fills every mood with the same global top list.
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
import { staticFiltered } from "./providers/static-catalog";

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

/** One Jikan genre id at a time — multi-id is AND and returns near-empty sets. */
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
    if (!res.ok) {
      return { data: [], error: `Jikan HTTP ${res.status}` };
    }
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

export async function getMoodCandidates(
  intent: ExperienceIntent,
  _session?: IntentSession | null,
  opts?: { perPool?: number },
): Promise<MoodCandidatesResult> {
  const perPool = opts?.perPool ?? 36;
  const retrieval: MoodRetrievalSource[] = [];
  const pools: Anime[] = [];

  // 1) Jikan genre pools FIRST (works when AniList is down)
  const jikanIds = MOOD_JIKAN_GENRES[intent.slug] || [];
  const jikanHits: Anime[] = [];
  if (jikanIds.length) {
    const jkResults = await Promise.all(
      jikanIds.slice(0, 3).map((gid) => poolJikanGenreId(gid, 25)),
    );
    jkResults.forEach((r, i) => {
      const gid = jikanIds[i];
      retrieval.push({
        source: `jikan:genre:${gid}`,
        requested: 25,
        returned: r.data.length,
        error: r.error,
      });
      jikanHits.push(...r.data);
    });
    pools.push(...jikanHits);
  }

  // 2) AniList tags
  const tagHints = MOOD_TAG_HINTS[intent.slug] || [];
  const tagAnimes: Anime[] = [];
  if (tagHints.length) {
    const tagResults = await Promise.allSettled(
      tagHints.slice(0, 3).map((tg) => poolTag(tg, perPool)),
    );
    tagResults.forEach((r, i) => {
      const tg = tagHints[i];
      if (r.status === "fulfilled") {
        retrieval.push({
          source: `tag:${tg}`,
          requested: perPool,
          returned: r.value.data.length,
          error: r.value.error,
        });
        tagAnimes.push(...r.value.data);
      } else {
        retrieval.push({
          source: `tag:${tg}`,
          requested: perPool,
          returned: 0,
          error: String(r.reason),
        });
      }
    });
    pools.push(...tagAnimes);
  }

  // 3) Genre filters — drop provider results that ignore genre
  const genres = (intent.genreHints || []).slice(0, 3);
  const genreAnimes: Anime[] = [];
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
          source: `genre:${g}`,
          requested: perPool,
          returned: kept.length || r.value.data.length,
          error: r.value.error,
        });
        genreAnimes.push(...(kept.length ? kept : r.value.data.slice(0, 8)));
      } else {
        retrieval.push({
          source: `genre:${g}`,
          requested: perPool,
          returned: 0,
          error: String(r.reason),
        });
      }
    });
    pools.push(...genreAnimes);
  }

  // 4) Static seed by mood keyword
  try {
    const primary =
      (intent.genreHints && intent.genreHints[0]) ||
      (MOOD_TAG_HINTS[intent.slug] && MOOD_TAG_HINTS[intent.slug][0]) ||
      "";
    if (primary) {
      const st = await staticFiltered({ genre: primary }, 1, 24);
      const kept = st.data.filter((a) => moodMatchScore(a, intent) >= 0.25);
      retrieval.push({
        source: `static:${primary}`,
        requested: 24,
        returned: kept.length,
      });
      pools.push(...kept);
    }
  } catch {
    /* soft */
  }

  // 5) Surprise only: trending
  if (intent.slug === "surprise") {
    try {
      const disc = await fetchDiscover("trending", 1, 36, "exclude");
      retrieval.push({
        source: "discover:trending",
        requested: 36,
        returned: disc.data.length,
      });
      pools.push(...disc.data);
    } catch (e) {
      retrieval.push({
        source: "discover:trending",
        requested: 36,
        returned: 0,
        error: e instanceof Error ? e.message : "discover failed",
      });
    }
  }

  let { unique, dropped } = dedupe(pools);

  // Retry primary jikan genre if still thin — never global top
  if (unique.length < 6 && intent.slug !== "surprise" && jikanIds[0]) {
    const more = await poolJikanGenreId(jikanIds[0], 25);
    retrieval.push({
      source: `jikan:genre:${jikanIds[0]}:retry`,
      requested: 25,
      returned: more.data.length,
      error: more.error,
    });
    ({ unique, dropped } = dedupe([...unique, ...more.data]));
  }

  if (unique.length < 4) {
    try {
      const st = await staticFiltered({}, 1, 40);
      retrieval.push({
        source: "static:seed-rank",
        requested: 40,
        returned: st.data.length,
      });
      ({ unique, dropped } = dedupe([...unique, ...st.data]));
    } catch {
      /* */
    }
  }

  const tagIds = new Set(tagAnimes.map((a) => a.id));
  const jikanIdSet = new Set(jikanHits.map((a) => a.idMal || a.id));

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
    let fit = hard * 0.82 + fpFit * 0.18;
    if (tagIds.has(anime.id)) fit = Math.min(1, fit + 0.08);
    if (jikanIdSet.has(anime.idMal || anime.id)) fit = Math.min(1, fit + 0.1);
    return { anime, fit, hard };
  });

  scored.sort((a, b) => {
    if (Math.abs(b.hard - a.hard) > 0.04) return b.hard - a.hard;
    return b.fit - a.fit;
  });

  let final = scored;
  const strong = scored.filter((s) => s.hard >= 0.3);
  if (strong.length >= 12) final = strong;
  else {
    const mid = scored.filter((s) => s.hard >= 0.15);
    if (mid.length >= 10) final = mid;
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
