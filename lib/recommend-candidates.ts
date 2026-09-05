/**
 * Multi-source recommendation candidate generation (R4).
 * Ranker should never only see a single trending page of 24.
 *
 * Soft-fail: any generator may return []; pool still usable.
 */

import type { Anime, WatchlistEntry } from "./types";
import { fetchDiscover, fetchFiltered } from "./anilist";
import { buildTasteClusters } from "./taste-clusters";
import { detectTasteTrends } from "./taste-drift";
import {
  getExperienceIntent,
  type ExperienceIntent,
} from "./viewing-intent";

export type CandidateSource =
  | "trending"
  | "popular"
  | "top"
  | "long_term_taste"
  | "emerging_taste"
  | "viewing_intent"
  | "exploration"
  | "unfinished";

export type RecommendationCandidate = {
  anime: Anime;
  sources: CandidateSource[];
  rawScore: number;
  reason?: string;
};

export type CandidatePool = {
  candidates: RecommendationCandidate[];
  byId: Map<number, RecommendationCandidate>;
  version: string;
  generatedAt: string;
};

const CANDIDATE_GENERATOR_VERSION = "candidate_v1";

function capitalGenre(g: string): string {
  return g
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Top genre labels from clusters for catalog queries. */
export function genresFromClusters(
  entries: WatchlistEntry[],
  limit = 4,
): string[] {
  const clusters = buildTasteClusters(entries);
  const scores: Record<string, number> = {};
  for (const c of clusters) {
    for (const [dim, w] of Object.entries(c.dims)) {
      scores[dim] = (scores[dim] || 0) + w * c.weight;
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => capitalGenre(g));
}

export function genresFromEmerging(entries: WatchlistEntry[], limit = 3): string[] {
  const trends = detectTasteTrends(entries, 2);
  return trends
    .filter((t) => t.direction === "up")
    .slice(0, limit)
    .map((t) => capitalGenre(t.dimension));
}

function mergeInto(
  byId: Map<number, RecommendationCandidate>,
  list: Anime[],
  source: CandidateSource,
  rawScore: number,
  reason?: string,
) {
  for (const anime of list) {
    if (!anime?.id) continue;
    const prev = byId.get(anime.id);
    if (prev) {
      if (!prev.sources.includes(source)) prev.sources.push(source);
      prev.rawScore = Math.max(prev.rawScore, rawScore);
      if (reason && !prev.reason) prev.reason = reason;
    } else {
      byId.set(anime.id, {
        anime,
        sources: [source],
        rawScore,
        reason,
      });
    }
  }
}

async function safePage(
  run: () => Promise<{ data: Anime[] }>,
): Promise<Anime[]> {
  try {
    const page = await run();
    return page.data || [];
  } catch {
    return [];
  }
}

export type GeneratePoolOptions = {
  entries: WatchlistEntry[];
  experienceSlug?: string | null;
  /** Cap unique titles in the merged pool */
  maxPool?: number;
  perSource?: number;
};

/**
 * Pull independent candidate streams, merge + dedupe.
 * Target ~200–400 uniques when APIs cooperate.
 */
export async function generateCandidatePool(
  opts: GeneratePoolOptions,
): Promise<CandidatePool> {
  const per = opts.perSource ?? 40;
  const maxPool = opts.maxPool ?? 400;
  const entries = opts.entries || [];
  const byId = new Map<number, RecommendationCandidate>();

  const tasteGenres = genresFromClusters(entries, 4);
  const emerging = genresFromEmerging(entries, 3);
  const exp: ExperienceIntent | undefined = opts.experienceSlug
    ? getExperienceIntent(opts.experienceSlug)
    : undefined;
  const intentGenres = exp?.genreHints?.length ? exp.genreHints : [];

  const seen = new Set(
    entries.flatMap((e) =>
      (e.genres || e.tags || []).map((g) => String(g).toLowerCase()),
    ),
  );
  const explorePool = [
    "Sports",
    "Music",
    "Horror",
    "Mecha",
    "Gourmet",
    "Historical",
    "Suspense",
  ].filter((g) => !seen.has(g.toLowerCase()));

  const jobs: Promise<void>[] = [];

  jobs.push(
    (async () => {
      const data = await safePage(() =>
        fetchDiscover("trending", 1, per, "exclude"),
      );
      mergeInto(byId, data, "trending", 0.35, "Trending now");
    })(),
  );
  jobs.push(
    (async () => {
      const data = await safePage(() =>
        fetchDiscover("popular", 1, per, "exclude"),
      );
      mergeInto(byId, data, "popular", 0.3, "Widely watched");
    })(),
  );
  jobs.push(
    (async () => {
      const data = await safePage(() =>
        fetchDiscover("top", 1, Math.min(per, 30), "exclude"),
      );
      mergeInto(byId, data, "top", 0.32, "Highly rated");
    })(),
  );

  for (const genre of tasteGenres.slice(0, 3)) {
    jobs.push(
      (async () => {
        const data = await safePage(() =>
          fetchFiltered(
            { genre, sort: "score", adultFilter: "exclude" },
            1,
            Math.min(per, 36),
          ),
        );
        mergeInto(
          byId,
          data,
          "long_term_taste",
          0.55,
          `Matches your ${genre} affinity`,
        );
      })(),
    );
  }

  for (const genre of emerging.slice(0, 2)) {
    if (tasteGenres.map((g) => g.toLowerCase()).includes(genre.toLowerCase()))
      continue;
    jobs.push(
      (async () => {
        const data = await safePage(() =>
          fetchFiltered(
            { genre, sort: "popularity", adultFilter: "exclude" },
            1,
            Math.min(per, 28),
          ),
        );
        mergeInto(
          byId,
          data,
          "emerging_taste",
          0.5,
          `Where your taste is heading · ${genre}`,
        );
      })(),
    );
  }

  for (const genre of intentGenres.slice(0, 2)) {
    jobs.push(
      (async () => {
        const data = await safePage(() =>
          fetchFiltered(
            {
              genre,
              sort: exp?.sort || "score",
              adultFilter: "exclude",
            },
            1,
            Math.min(per, 32),
          ),
        );
        mergeInto(
          byId,
          data,
          "viewing_intent",
          0.58,
          exp ? `Tonight · ${exp.label}` : "Session intent",
        );
      })(),
    );
  }

  if (explorePool[0]) {
    const genre = explorePool[0];
    jobs.push(
      (async () => {
        const data = await safePage(() =>
          fetchFiltered(
            { genre, sort: "score", adultFilter: "exclude" },
            1,
            20,
          ),
        );
        mergeInto(
          byId,
          data,
          "exploration",
          0.22,
          `Outside your usual · ${genre}`,
        );
      })(),
    );
  }

  await Promise.all(jobs);

  let candidates = [...byId.values()].sort((a, b) => {
    const sa = a.sources.length * 0.08 + a.rawScore;
    const sb = b.sources.length * 0.08 + b.rawScore;
    return sb - sa;
  });

  if (candidates.length > maxPool) {
    candidates = candidates.slice(0, maxPool);
  }

  const trimmed = new Map<number, RecommendationCandidate>();
  for (const c of candidates) trimmed.set(c.anime.id, c);

  return {
    candidates,
    byId: trimmed,
    version: CANDIDATE_GENERATOR_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

export function poolToAnimeList(pool: CandidatePool): Anime[] {
  return pool.candidates.map((c) => c.anime);
}

export function describeCandidateSources(sources: CandidateSource[]): string {
  const labels: Record<CandidateSource, string> = {
    trending: "trending",
    popular: "popular",
    top: "highly rated",
    long_term_taste: "your taste",
    emerging_taste: "emerging interest",
    viewing_intent: "tonight’s intent",
    exploration: "exploration",
    unfinished: "your shelf",
  };
  return sources.map((s) => labels[s] || s).join(" · ");
}
