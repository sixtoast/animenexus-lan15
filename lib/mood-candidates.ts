/**
 * Multi-source Mood candidate retrieval.
 * Genres are retrieval hints ONLY — never semantic truth.
 */

import type { Anime } from "./types";
import { fetchDiscover, fetchFiltered } from "./anilist";
import {
  getExperienceIntent,
  type ExperienceIntent,
} from "./viewing-intent";
import type { IntentSession } from "./intent-session";
import { identityFromAnime, ensureNexusId } from "./anime-identity";

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

/** Valid AniList-ish tag names only — never product semantic dims as API tags. */
const MOOD_TAG_HINTS: Record<string, string[]> = {
  destroy: ["Tragedy", "Coming of Age", "Drama"],
  comfort: ["Iyashikei", "Slice of Life", "CGDCT"],
  think: ["Psychological", "Philosophy", "Detective"],
  laugh: ["Comedy", "Parody", "Gag Humor"],
  tense: ["Suspense", "Thriller", "Psychological"],
  wonder: ["Fantasy", "Adventure", "Space"],
  gentle: ["Iyashikei", "Slice of Life", "School"],
  chaotic: ["Comedy", "Action", "Parody"],
  romance: ["Romance", "School"],
  surprise: [],
};

async function poolGenre(
  genre: string,
  perPage: number,
): Promise<{ data: Anime[]; error?: string }> {
  try {
    const page = await fetchFiltered(
      { genre, sort: "score", adultFilter: "exclude" },
      1,
      perPage,
    );
    return { data: page.data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "genre pool failed",
    };
  }
}

async function poolTag(
  tag: string,
  perPage: number,
): Promise<{ data: Anime[]; error?: string }> {
  try {
    const page = await fetchFiltered(
      { tag, sort: "score", adultFilter: "exclude" },
      1,
      perPage,
    );
    return { data: page.data };
  } catch (e) {
    // Do NOT fall back to title search — that is not semantic tag retrieval.
    return {
      data: [],
      error: e instanceof Error ? e.message : "tag pool failed",
    };
  }
}

async function poolQuality(
  perPage: number,
): Promise<{ data: Anime[]; error?: string }> {
  try {
    const [top, trending] = await Promise.all([
      fetchDiscover("top", 1, Math.ceil(perPage / 2), "exclude"),
      fetchDiscover("trending", 1, Math.ceil(perPage / 2), "exclude"),
    ]);
    return { data: [...top.data, ...trending.data] };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : "quality pool failed",
    };
  }
}

function dedupe(animes: Anime[]): { unique: Anime[]; dropped: number } {
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

  // 1) Real AniList tag pools first (mood-specific)
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

  // 2) Genre hint pools (retrieval only, not semantic truth)
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

  // 3) Tiny quality safety net — only if tag+genre are thin
  let { unique, dropped } = dedupe([...tagAnimes, ...genreAnimes]);

  if (unique.length < 48) {
    const quality = await poolQuality(12);
    retrieval.push({
      source: "quality:top+trending",
      requested: 12,
      returned: quality.data.length,
      error: quality.error,
    });
    ({ unique, dropped } = dedupe([...unique, ...quality.data]));
  }

  if (unique.length < 36) {
    const more = await poolQuality(16);
    retrieval.push({
      source: "quality:broaden",
      requested: 16,
      returned: more.data.length,
      error: more.error,
    });
    ({ unique, dropped } = dedupe([...unique, ...more.data]));
  }

  const candidates: MoodCandidate[] = unique.map((anime) => ({
    identity: ensureNexusId(identityFromAnime(anime)),
    anime,
  }));

  return { candidates, retrieval, dedupeCount: dropped };
}

export async function getMoodCandidatesBySlug(
  slug: string,
  session?: IntentSession | null,
): Promise<MoodCandidatesResult> {
  const intent = getExperienceIntent(slug);
  if (!intent) {
    return { candidates: [], retrieval: [], dedupeCount: 0 };
  }
  return getMoodCandidates(intent, session);
}
