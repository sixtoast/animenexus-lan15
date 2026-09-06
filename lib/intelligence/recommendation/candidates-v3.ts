/**
 * Candidate Generation V3 — multi-source pool with fingerprint scoring.
 * Genre queries are retrieval fallback only; scores use fingerprints.
 * Soft-fail: any generator may return [].
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import { fetchDiscover, fetchFiltered } from "@/lib/anilist";
import {
  buildAnimePreferenceFingerprint,
  fingerprintToVector,
  indexAnimeList,
  indexFingerprint,
  nearestFingerprints,
  entryToAnime,
  type AnimePreferenceFingerprint,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import {
  vectorSimilarity,
  WEIGHTS_LONG_TERM,
  WEIGHTS_TONIGHT,
  WEIGHTS_BLIND_SPOT,
  type FingerprintSimilarityWeights,
} from "@/lib/intelligence/items/fingerprint-similarity";
import {
  blendUserVector,
  buildUserPreferenceVector,
  type UserPreferenceVector,
} from "@/lib/intelligence/preference/user-preference-vector";
import {
  buildTasteClustersV3,
  type TasteClusterV3,
} from "@/lib/intelligence/taste/taste-clusters-v3";
import {
  detectTasteDriftV3,
  type FingerprintTrend,
} from "@/lib/intelligence/taste/taste-drift-v3";
import {
  getExperienceIntent,
  type ExperienceIntent,
} from "@/lib/viewing-intent";
import { readIntentSession } from "@/lib/intent-session";

export const CANDIDATE_GENERATOR_VERSION = "candidate_v3";

export type CandidateSourceV3 =
  | "trending_for_you"
  | "popular"
  | "top"
  | "stable_taste"
  | "active_cluster"
  | "emerging_taste"
  | "viewing_intent"
  | "exploration"
  | "unfinished"
  | "fingerprint_nn";

export type RecommendationCandidateV3 = {
  anime: Anime;
  sources: CandidateSourceV3[];
  rawScore: number;
  sourceAgreement: number;
  reason?: string;
  fingerprintConfidence?: number;
};

export type CandidatePoolV3 = {
  candidates: RecommendationCandidateV3[];
  byId: Map<number, RecommendationCandidateV3>;
  version: string;
  generatedAt: string;
  diagnostics: {
    generators: Record<string, number>;
    degradation: string[];
  };
};

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

function mergeCandidate(
  byId: Map<number, RecommendationCandidateV3>,
  anime: Anime,
  source: CandidateSourceV3,
  rawScore: number,
  reason?: string,
  fpConf?: number,
) {
  if (!anime?.id) return;
  const prev = byId.get(anime.id);
  if (prev) {
    if (!prev.sources.includes(source)) prev.sources.push(source);
    prev.sourceAgreement = prev.sources.length;
    prev.rawScore = Math.max(prev.rawScore, rawScore);
    if (reason && rawScore >= prev.rawScore - 0.05) prev.reason = reason;
    if (fpConf != null) {
      prev.fingerprintConfidence = Math.max(
        prev.fingerprintConfidence ?? 0,
        fpConf,
      );
    }
  } else {
    byId.set(anime.id, {
      anime,
      sources: [source],
      rawScore,
      sourceAgreement: 1,
      reason,
      fingerprintConfidence: fpConf,
    });
  }
}

function ensureFp(
  anime: Anime,
  fps: Map<number, AnimePreferenceFingerprint>,
): AnimePreferenceFingerprint {
  let fp = fps.get(anime.id);
  if (!fp) {
    fp = buildAnimePreferenceFingerprint(anime);
    fps.set(anime.id, fp);
  }
  indexFingerprint(anime, fp);
  return fp;
}

function scoreAgainst(
  anime: Anime,
  target: FingerprintVector,
  weights: FingerprintSimilarityWeights,
  fps: Map<number, AnimePreferenceFingerprint>,
): { score: number; conf: number } {
  const fp = ensureFp(anime, fps);
  return {
    score: vectorSimilarity(target, fp, weights),
    conf: fp.confidence.overall,
  };
}

function capitalGenre(g: string): string {
  return g
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function retrievalGenres(clusters: TasteClusterV3[], limit = 3): string[] {
  const scores: Record<string, number> = {};
  for (const c of clusters) {
    for (const g of c.genreHints) {
      scores[g] = (scores[g] || 0) + c.strength;
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => capitalGenre(g));
}

function explorationSeedGenres(
  user: UserPreferenceVector,
  trends: FingerprintTrend[],
): string[] {
  const blended = blendUserVector(user);
  const seeds: string[] = [];
  const val = (key: string) => blended[key] ?? 0.5;
  const low = (key: string) => val(key) < 0.42;
  const high = (key: string) => val(key) > 0.58;

  if (
    high("narrative.worldBuilding") &&
    high("narrative.politicalComplexity") &&
    low("emotional.wonder")
  ) {
    seeds.push("Sci-Fi", "Fantasy");
  }
  if (
    high("narrative.characterFocus") &&
    high("emotional.melancholy") &&
    low("narrative.mysteryDensity")
  ) {
    seeds.push("Mystery", "Psychological");
  }
  if (high("experience.actionIntensity") && low("emotional.humour")) {
    seeds.push("Comedy");
  }
  if (high("emotional.comfort") && low("experience.actionIntensity")) {
    seeds.push("Adventure", "Sports");
  }
  for (const t of trends.filter((x) => x.direction === "up").slice(0, 2)) {
    if (t.dimension.includes("mystery")) seeds.push("Mystery");
    if (t.dimension.includes("humour")) seeds.push("Comedy");
    if (t.dimension.includes("romance")) seeds.push("Romance");
    if (t.dimension.includes("cognitive")) seeds.push("Psychological");
  }
  return [...new Set(seeds)].slice(0, 3);
}

function intentPullVector(
  base: FingerprintVector,
  exp: ExperienceIntent,
): FingerprintVector {
  const out = { ...base };
  const tip = buildAnimePreferenceFingerprint({
    id: -2,
    title: exp.label,
    description: exp.blurb || "",
    genre: exp.genreHints?.[0] || "",
    tags: exp.genreHints || [],
    status: "FINISHED",
    format: "TV",
    year: "",
    score: 0,
    popularity: 0,
    image: "",
    anilist_id: -2,
    episodes: 12,
    duration: 24,
  });
  const tipVec = fingerprintToVector(tip);
  for (const [k, v] of Object.entries(tipVec)) {
    out[k] = (out[k] ?? 0.5) * 0.45 + v * 0.55;
  }
  return out;
}

function shelfAnime(e: WatchlistEntry): Anime {
  return {
    id: e.id,
    title: e.title,
    description: "",
    genre: (e.genres || [])[0] || "",
    tags: e.genres || e.tags || [],
    status: "RELEASING",
    format: (e.format as never) || "TV",
    year: e.year || "",
    score: e.score || 0,
    popularity: 0,
    image: e.image,
    anilist_id: e.id,
    episodes: e.episodes ?? "",
    duration: e.duration || 24,
  };
}

export type GeneratePoolV3Options = {
  entries: WatchlistEntry[];
  experienceSlug?: string | null;
  maxPool?: number;
  perSource?: number;
};

export async function generateCandidatePoolV3(
  opts: GeneratePoolV3Options,
): Promise<CandidatePoolV3> {
  const per = opts.perSource ?? 36;
  const maxPool = opts.maxPool ?? 320;
  const entries = opts.entries || [];
  const byId = new Map<number, RecommendationCandidateV3>();
  const diagnostics = {
    generators: {} as Record<string, number>,
    degradation: [] as string[],
  };

  const user = buildUserPreferenceVector(entries);
  const userVec = blendUserVector(user);
  const clusters = buildTasteClustersV3(entries);
  const trends = detectTasteDriftV3(entries, { minEvidence: 2 });
  const fps = new Map<number, AnimePreferenceFingerprint>();

  let slug = opts.experienceSlug ?? null;
  if (slug == null && typeof window !== "undefined") {
    try {
      slug = readIntentSession().slug;
    } catch {
      slug = null;
    }
  }
  const exp = slug ? getExperienceIntent(slug) : undefined;

  const jobs: Promise<void>[] = [];

  jobs.push(
    (async () => {
      const data = await safePage(() =>
        fetchDiscover("trending", 1, per, "exclude"),
      );
      let n = 0;
      for (const a of data) {
        const { score, conf } = scoreAgainst(a, userVec, WEIGHTS_TONIGHT, fps);
        const combined = 0.2 + score * 0.7;
        if (entries.length < 2 || combined >= 0.42) {
          mergeCandidate(
            byId,
            a,
            "trending_for_you",
            combined,
            "Trending · fingerprint fit",
            conf,
          );
          n++;
        }
      }
      diagnostics.generators.trending_for_you = n;
      if (!data.length) diagnostics.degradation.push("trending_empty");
    })(),
  );

  jobs.push(
    (async () => {
      const data = await safePage(() =>
        fetchDiscover("popular", 1, per, "exclude"),
      );
      let n = 0;
      for (const a of data) {
        const { score, conf } = scoreAgainst(
          a,
          userVec,
          WEIGHTS_LONG_TERM,
          fps,
        );
        if (entries.length < 2 || score >= 0.4) {
          mergeCandidate(
            byId,
            a,
            "popular",
            score * 0.9,
            "Widely watched · fit",
            conf,
          );
          n++;
        }
      }
      diagnostics.generators.popular = n;
    })(),
  );

  jobs.push(
    (async () => {
      const data = await safePage(() =>
        fetchDiscover("top", 1, Math.min(per, 30), "exclude"),
      );
      let n = 0;
      for (const a of data) {
        const { score, conf } = scoreAgainst(
          a,
          userVec,
          WEIGHTS_LONG_TERM,
          fps,
        );
        if (entries.length < 2 || score >= 0.38) {
          mergeCandidate(
            byId,
            a,
            "top",
            score * 0.92,
            "Highly rated · fit",
            conf,
          );
          n++;
        }
      }
      diagnostics.generators.top = n;
    })(),
  );

  jobs.push(
    (async () => {
      const genres = retrievalGenres(clusters, 3);
      const use = genres.length
        ? genres.slice(0, 2)
        : entries.length
          ? ["Drama"]
          : [];
      if (!use.length) {
        diagnostics.generators.stable_taste = 0;
        return;
      }
      const lists = await Promise.all(
        use.map((genre) =>
          safePage(() =>
            fetchFiltered(
              { genre, sort: "score", adultFilter: "exclude" },
              1,
              Math.min(per, 36),
            ),
          ),
        ),
      );
      let n = 0;
      const active = clusters[0];
      const target = active?.vector || userVec;
      for (const data of lists) {
        for (const a of data) {
          const { score, conf } = scoreAgainst(
            a,
            target,
            WEIGHTS_LONG_TERM,
            fps,
          );
          if (score < 0.36 && entries.length >= 3) continue;
          mergeCandidate(
            byId,
            a,
            "stable_taste",
            0.45 + score * 0.5,
            active
              ? `Stable cluster · ${active.label}`
              : "Stable taste fingerprint",
            conf,
          );
          n++;
        }
      }
      diagnostics.generators.stable_taste = n;
    })(),
  );

  jobs.push(
    (async () => {
      const active =
        clusters.find((c) => c.state === "stable") || clusters[0];
      if (!active) {
        diagnostics.generators.active_cluster = 0;
        return;
      }
      const hint = active.genreHints[0]
        ? capitalGenre(active.genreHints[0])
        : null;
      const data = hint
        ? await safePage(() =>
            fetchFiltered(
              { genre: hint, sort: "popularity", adultFilter: "exclude" },
              1,
              Math.min(per, 28),
            ),
          )
        : [];
      let n = 0;
      for (const a of data) {
        const { score, conf } = scoreAgainst(
          a,
          active.vector,
          WEIGHTS_TONIGHT,
          fps,
        );
        if (score < 0.34) continue;
        mergeCandidate(
          byId,
          a,
          "active_cluster",
          0.5 + score * 0.45,
          `Active · ${active.label}`,
          conf,
        );
        n++;
      }
      diagnostics.generators.active_cluster = n;
    })(),
  );

  jobs.push(
    (async () => {
      const rising = trends.filter((t) => t.direction === "up").slice(0, 3);
      if (!rising.length) {
        diagnostics.generators.emerging_taste = 0;
        return;
      }
      const target = { ...userVec };
      for (const t of rising) {
        target[t.dimension] = Math.min(
          1,
          (target[t.dimension] ?? 0.5) + 0.2 * t.strength,
        );
      }
      const seedGenres = explorationSeedGenres(user, rising);
      const data = seedGenres[0]
        ? await safePage(() =>
            fetchFiltered(
              {
                genre: seedGenres[0],
                sort: "popularity",
                adultFilter: "exclude",
              },
              1,
              Math.min(per, 28),
            ),
          )
        : await safePage(() => fetchDiscover("trending", 1, 24, "exclude"));
      let n = 0;
      for (const a of data) {
        const { score, conf } = scoreAgainst(
          a,
          target,
          WEIGHTS_BLIND_SPOT,
          fps,
        );
        if (score < 0.33) continue;
        mergeCandidate(
          byId,
          a,
          "emerging_taste",
          0.48 + score * 0.45,
          `Emerging · ${rising.map((r) => r.label).join(", ")}`,
          conf,
        );
        n++;
      }
      diagnostics.generators.emerging_taste = n;
    })(),
  );

  jobs.push(
    (async () => {
      if (!exp) {
        diagnostics.generators.viewing_intent = 0;
        return;
      }
      const intentUser = intentPullVector(userVec, exp);
      const genre = exp.genreHints?.[0];
      const data = genre
        ? await safePage(() =>
            fetchFiltered(
              {
                genre,
                sort:
                  exp.sort === "popularity" || exp.sort === "trending"
                    ? "popularity"
                    : "score",
                adultFilter: "exclude",
              },
              1,
              Math.min(per, 32),
            ),
          )
        : await safePage(() => fetchDiscover("popular", 1, 24, "exclude"));
      let n = 0;
      for (const a of data) {
        const { score, conf } = scoreAgainst(
          a,
          intentUser,
          WEIGHTS_TONIGHT,
          fps,
        );
        if (score < 0.32) continue;
        mergeCandidate(
          byId,
          a,
          "viewing_intent",
          0.52 + score * 0.42,
          `Tonight · ${exp.label}`,
          conf,
        );
        n++;
      }
      diagnostics.generators.viewing_intent = n;
    })(),
  );

  jobs.push(
    (async () => {
      const seeds = explorationSeedGenres(user, trends);
      if (!seeds.length) {
        diagnostics.generators.exploration = 0;
        return;
      }
      const data = await safePage(() =>
        fetchFiltered(
          { genre: seeds[0], sort: "score", adultFilter: "exclude" },
          1,
          20,
        ),
      );
      let n = 0;
      for (const a of data) {
        const { score, conf } = scoreAgainst(
          a,
          userVec,
          WEIGHTS_BLIND_SPOT,
          fps,
        );
        if (score < 0.28 || score > 0.72) continue;
        mergeCandidate(
          byId,
          a,
          "exploration",
          0.28 + score * 0.35,
          `Exploration · adjacent ${seeds[0]}`,
          conf,
        );
        n++;
      }
      diagnostics.generators.exploration = n;
    })(),
  );

  let unfinished = 0;
  for (const e of entries) {
    if (e.watchStatus === "watching" || e.watchStatus === "paused") {
      mergeCandidate(
        byId,
        shelfAnime(e),
        "unfinished",
        0.7,
        "Continue from shelf",
        0.8,
      );
      unfinished++;
    }
  }
  diagnostics.generators.unfinished = unfinished;

  await Promise.all(jobs);

  // Index pool + shelf, then nearest-neighbour retrieval (replaces semantic_placeholder)
  try {
    indexAnimeList(
      [...byId.values()].map((c) => c.anime),
      fps,
    );
    for (const e of entries) {
      indexFingerprint(shelfAnime(e), fps.get(e.id));
    }
    const exclude = new Set(entries.map((e) => e.id));
    const hits = nearestFingerprints(userVec, {
      k: 28,
      excludeIds: exclude,
      minSimilarity: 0.38,
      weights: WEIGHTS_LONG_TERM,
    });
    let nn = 0;
    for (const hit of hits) {
      const anime =
        byId.get(hit.animeId)?.anime || entryToAnime(hit.entry);
      mergeCandidate(
        byId,
        anime,
        "fingerprint_nn",
        0.35 + hit.similarity * 0.5,
        `Fingerprint neighbour · sim ${hit.similarity.toFixed(2)}`,
        hit.entry.fingerprint.confidence.overall,
      );
      nn++;
    }
    diagnostics.generators.fingerprint_nn = nn;
  } catch {
    diagnostics.generators.fingerprint_nn = 0;
    diagnostics.degradation.push("fingerprint_nn_failed");
  }

  let candidates = [...byId.values()].map((c) => ({
    ...c,
    sourceAgreement: c.sources.length,
    rawScore: c.rawScore + Math.min(0.12, (c.sources.length - 1) * 0.04),
  }));

  candidates.sort((a, b) => b.rawScore - a.rawScore);
  if (candidates.length > maxPool) candidates = candidates.slice(0, maxPool);

  const trimmed = new Map<number, RecommendationCandidateV3>();
  for (const c of candidates) trimmed.set(c.anime.id, c);

  return {
    candidates,
    byId: trimmed,
    version: CANDIDATE_GENERATOR_VERSION,
    generatedAt: new Date().toISOString(),
    diagnostics,
  };
}

export function poolV3ToAnimeList(pool: CandidatePoolV3): Anime[] {
  return pool.candidates.map((c) => c.anime);
}
