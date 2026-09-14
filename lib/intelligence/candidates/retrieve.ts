/**
 * Shared candidate retrieval — dedup by canonical nexusId.
 * Discovery + semantic-neighbour pools for Fusion/Reverse.
 */
import type { Anime } from "@/lib/types";
import { identityFromAnime, ensureNexusId } from "@/lib/anime-identity";
import {
  findSemanticNeighbours,
  indexFingerprint,
  type SemanticNeighbour,
} from "./semantic-index";
import type { AnimePreferenceFingerprint } from "@/lib/intelligence/items/anime-preference-fingerprint";

export type CandidateIntent = "fusion" | "reverse" | "recommendation";

export type CandidateSource =
  | "challenge_pool"
  | "recommend_popular"
  | "recommend_score"
  | "recommend_genres"
  | "seed_genres"
  | "seed_shikimori_similar"
  | "seed_jikan_recommendations"
  | "seed_anilist_links"
  | "seed_fallback"
  | "semantic_neighbour"
  | "semantic_neighbour_a"
  | "semantic_neighbour_b"
  | "personal"
  | "cache";

export type ProviderIdentity = {
  anilist?: number;
  mal?: number;
};

export type RetrievalHints = {
  genres: string[];
  tags: string[];
  themes: string[];
  categories: string[];
  demographics: string[];
};

export type CandidateRecord = {
  anime: Anime;
  nexusId: string;
  sources: CandidateSource[];
  providerIds: ProviderIdentity;
  fingerprint?: AnimePreferenceFingerprint;
  semanticSimilarity?: number;
};

export type RetrieveOptions = {
  intent: CandidateIntent;
  seeds?: Anime[];
  providerHints?: string[];
  hints?: Partial<RetrievalHints>;
  excludeIds?: number[];
  excludeNexusIds?: string[];
  limit?: number;
  personal?: Anime[];
  targetFingerprint?: AnimePreferenceFingerprint;
  fingerprintA?: AnimePreferenceFingerprint;
  fingerprintB?: AnimePreferenceFingerprint;
};

export type RetrieveDiagnostics = {
  totalCandidatesBeforeDedup: number;
  totalCandidatesAfterDedup: number;
  sourceCounts: Record<string, number>;
  semanticNeighbourCount: number;
  providersAttempted: string[];
  providersSucceeded: string[];
  providersFailed: string[];
  cacheHits: number;
};

function nexusOf(a: Anime): string {
  try {
    return ensureNexusId(identityFromAnime(a)).nexusId || `anilist:${a.id}`;
  } catch {
    return `anilist:${a.id}`;
  }
}

async function pullJson(
  url: string,
): Promise<{ data: Anime[]; ok: boolean; meta?: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { data: [], ok: false };
    const j = await res.json();
    const data = (j.data || j.media || []) as Anime[];
    return {
      data: Array.isArray(data) ? data : [],
      ok: true,
      meta: j as Record<string, unknown>,
    };
  } catch {
    return { data: [], ok: false };
  }
}

function mapSeedSource(raw: string): CandidateSource {
  if (raw.includes("shikimori")) return "seed_shikimori_similar";
  if (raw.includes("jikan")) return "seed_jikan_recommendations";
  if (raw.includes("anilist")) return "seed_anilist_links";
  return "seed_fallback";
}

function collectHints(opts: RetrieveOptions): RetrievalHints {
  const genres: string[] = [...(opts.hints?.genres || [])];
  const tags: string[] = [...(opts.hints?.tags || [])];
  for (const g of opts.providerHints || []) if (g?.trim()) genres.push(g.trim());
  for (const s of opts.seeds || []) {
    if (typeof s.genre === "string" && s.genre && s.genre !== "N/A") genres.push(s.genre);
    for (const t of s.tags || []) if (t?.trim()) tags.push(t.trim());
  }
  const u = (a: string[]) => [...new Set(a.map((x) => x.trim()).filter(Boolean))];
  return {
    genres: u(genres).slice(0, 8),
    tags: u(tags).slice(0, 12),
    themes: u(opts.hints?.themes || []).slice(0, 8),
    categories: u(opts.hints?.categories || []).slice(0, 8),
    demographics: u(opts.hints?.demographics || []).slice(0, 4),
  };
}

function stubFromNeighbour(n: SemanticNeighbour): Anime {
  return {
    id: n.animeId,
    title: `Indexed #${n.animeId}`,
    description: "",
    genre: "N/A",
    tags: [],
    status: "FINISHED",
    format: "TV",
    year: "?",
    score: 0,
    popularity: 0,
    image: "",
    anilist_id: n.animeId < 20_000_000 ? n.animeId : 0,
    episodes: "?",
    duration: 0,
    isAdult: false,
  };
}

export async function retrieveAnimeCandidates(
  opts: RetrieveOptions,
): Promise<{
  candidates: CandidateRecord[];
  providersAttempted: string[];
  uniqueCandidateCount: number;
  diagnostics: RetrieveDiagnostics;
}> {
  const limit = opts.limit ?? 120;
  const excludeIds = new Set<number>(opts.excludeIds || []);
  const excludeNx = new Set<string>(opts.excludeNexusIds || []);
  for (const s of opts.seeds || []) {
    excludeIds.add(s.id);
    excludeNx.add(nexusOf(s));
  }

  const byNexusId = new Map<string, CandidateRecord>();
  let beforeDedup = 0;
  const attempted: string[] = [];
  const succeeded: string[] = [];
  const failed: string[] = [];
  const sourceCounts: Record<string, number> = {};
  let semanticNeighbourCount = 0;
  let cacheHits = 0;

  function ingest(
    list: Anime[],
    source: CandidateSource,
    extra?: Partial<CandidateRecord>,
  ) {
    for (const a of list) {
      if (!a?.id || excludeIds.has(a.id)) continue;
      const nexusId = extra?.nexusId || nexusOf(a);
      if (excludeNx.has(nexusId)) continue;
      beforeDedup++;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      const existing = byNexusId.get(nexusId);
      if (existing) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
        if (extra?.fingerprint && !existing.fingerprint)
          existing.fingerprint = extra.fingerprint;
        if (
          extra?.semanticSimilarity != null &&
          (existing.semanticSimilarity == null ||
            extra.semanticSimilarity > existing.semanticSimilarity)
        ) {
          existing.semanticSimilarity = extra.semanticSimilarity;
        }
        continue;
      }
      byNexusId.set(nexusId, {
        anime: a,
        nexusId,
        sources: [source],
        providerIds: {
          anilist: a.anilist_id || (a.id < 20_000_000 ? a.id : undefined),
          mal: a.idMal || undefined,
          ...extra?.providerIds,
        },
        fingerprint: extra?.fingerprint,
        semanticSimilarity: extra?.semanticSimilarity,
      });
    }
  }

  if (opts.targetFingerprint) {
    attempted.push("semantic_neighbours_target");
    try {
      const neighbours = findSemanticNeighbours({
        target: opts.targetFingerprint,
        limit: 40,
        excludeNexusIds: [...excludeNx],
        excludeAnimeIds: [...excludeIds],
      });
      semanticNeighbourCount += neighbours.length;
      if (neighbours.length) succeeded.push("semantic_neighbours_target");
      for (const n of neighbours) {
        ingest([stubFromNeighbour(n)], "semantic_neighbour", {
          nexusId: n.nexusId,
          fingerprint: n.fingerprint,
          semanticSimilarity: n.similarity,
        });
      }
    } catch {
      failed.push("semantic_neighbours_target");
    }
  }

  for (const [fp, src] of [
    [opts.fingerprintA, "semantic_neighbour_a"] as const,
    [opts.fingerprintB, "semantic_neighbour_b"] as const,
  ]) {
    if (!fp) continue;
    attempted.push(src);
    try {
      const neighbours = findSemanticNeighbours({
        target: fp,
        limit: 16,
        excludeNexusIds: [...excludeNx],
        excludeAnimeIds: [...excludeIds],
      });
      semanticNeighbourCount += neighbours.length;
      if (neighbours.length) succeeded.push(src);
      for (const n of neighbours) {
        ingest([stubFromNeighbour(n)], src, {
          nexusId: n.nexusId,
          fingerprint: n.fingerprint,
          semanticSimilarity: n.similarity,
        });
      }
    } catch {
      failed.push(src);
    }
  }

  const seedJobs = (opts.seeds || []).slice(0, 4).map(async (seed) => {
    const mal = seed.idMal || 0;
    const q = new URLSearchParams();
    if (seed.id) q.set("id", String(seed.id));
    if (mal) q.set("malId", String(mal));
    q.set("limit", "16");
    const name = `seed_candidates:${seed.id}`;
    attempted.push(name);
    const { data, ok, meta } = await pullJson(`/api/seed-candidates?${q}`);
    if (!ok || !data.length) {
      failed.push(name);
      return;
    }
    succeeded.push(name);
    const srcList = (meta?.sources as string[]) || [];
    const source =
      srcList.length > 0
        ? mapSeedSource(srcList[0])
        : ("seed_fallback" as CandidateSource);
    ingest(data, source);
    for (const s of srcList.slice(1)) ingest(data, mapSeedSource(s));
  });

  const hints = collectHints(opts);
  const genreFilter = hints.genres.slice(0, 4);
  const excludeQ = [...excludeIds].join(",");
  const jobs: { name: string; url: string; source: CandidateSource }[] = [
    { name: "challenge_pool", url: "/api/challenge-pool", source: "challenge_pool" },
    {
      name: "recommend_popular",
      url: `/api/recommend?mode=popular&exclude=${excludeQ}`,
      source: "recommend_popular",
    },
    {
      name: "recommend_score",
      url: `/api/recommend?mode=score&exclude=${excludeQ}`,
      source: "recommend_score",
    },
  ];
  if (genreFilter.length) {
    jobs.push({
      name: "recommend_genres",
      url: `/api/recommend?mode=popular&genres=${encodeURIComponent(genreFilter.join(","))}&exclude=${excludeQ}`,
      source: "recommend_genres",
    });
  }

  await Promise.allSettled([
    ...seedJobs,
    ...jobs.map(async (j) => {
      attempted.push(j.name);
      const { data, ok } = await pullJson(j.url);
      if (!ok) {
        failed.push(j.name);
        return;
      }
      succeeded.push(j.name);
      ingest(data, j.source);
    }),
  ]);

  if (opts.personal?.length) {
    ingest(
      opts.personal.filter((a) => !excludeIds.has(a.id)),
      "personal",
    );
  }

  for (const rec of byNexusId.values()) {
    if (rec.fingerprint) {
      indexFingerprint(rec.nexusId, rec.fingerprint);
      cacheHits++;
    }
  }

  const candidates = [...byNexusId.values()].slice(0, limit);
  return {
    candidates,
    providersAttempted: attempted,
    uniqueCandidateCount: candidates.length,
    diagnostics: {
      totalCandidatesBeforeDedup: beforeDedup,
      totalCandidatesAfterDedup: candidates.length,
      sourceCounts,
      semanticNeighbourCount,
      providersAttempted: attempted,
      providersSucceeded: succeeded,
      providersFailed: failed,
      cacheHits,
    },
  };
}
