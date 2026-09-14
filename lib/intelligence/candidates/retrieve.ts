/**
 * Shared candidate retrieval for Fusion / Reverse / tools.
 * Includes seed-driven Shikimori-similar / Jikan recommendations via /api/seed-candidates.
 */
import type { Anime } from "@/lib/types";
import { identityFromAnime, ensureNexusId } from "@/lib/anime-identity";

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
  | "personal"
  | "cache";

export type ProviderIdentity = {
  anilist?: number;
  mal?: number;
};

export type CandidateRecord = {
  anime: Anime;
  nexusId: string;
  sources: CandidateSource[];
  providerIds: ProviderIdentity;
};

export type RetrieveOptions = {
  intent: CandidateIntent;
  seeds?: Anime[];
  providerHints?: string[];
  excludeIds?: number[];
  limit?: number;
  personal?: Anime[];
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

export async function retrieveAnimeCandidates(
  opts: RetrieveOptions,
): Promise<{
  candidates: CandidateRecord[];
  providersAttempted: string[];
  uniqueCandidateCount: number;
}> {
  const limit = opts.limit ?? 120;
  const exclude = new Set<number>(opts.excludeIds || []);
  for (const s of opts.seeds || []) exclude.add(s.id);

  const byId = new Map<number, CandidateRecord>();
  const attempted: string[] = [];

  function ingest(list: Anime[], source: CandidateSource) {
    for (const a of list) {
      if (!a?.id || exclude.has(a.id)) continue;
      const existing = byId.get(a.id);
      if (existing) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
        continue;
      }
      byId.set(a.id, {
        anime: a,
        nexusId: nexusOf(a),
        sources: [source],
        providerIds: {
          anilist: a.anilist_id || (a.id < 20_000_000 ? a.id : undefined),
          mal: a.idMal || undefined,
        },
      });
    }
  }

  const seedJobs = (opts.seeds || []).slice(0, 4).map(async (seed) => {
    const mal =
      seed.idMal ||
      (typeof (seed as { mal_id?: number }).mal_id === "number"
        ? (seed as { mal_id?: number }).mal_id
        : 0) ||
      0;
    const q = new URLSearchParams();
    if (seed.id) q.set("id", String(seed.id));
    if (mal) q.set("malId", String(mal));
    q.set("limit", "16");
    const name = `seed_candidates:${seed.id}`;
    attempted.push(name);
    const { data, ok, meta } = await pullJson(`/api/seed-candidates?${q}`);
    if (!ok || !data.length) return;
    const srcList = (meta?.sources as string[]) || [];
    const source =
      srcList.length > 0
        ? mapSeedSource(srcList[0])
        : ("seed_fallback" as CandidateSource);
    ingest(data, source);
    for (const s of srcList.slice(1)) {
      ingest(data, mapSeedSource(s));
    }
  });

  const genreHints = [
    ...(opts.providerHints || []),
    ...(opts.seeds || []).flatMap((s) => {
      const g = [
        ...(Array.isArray((s as { genres?: string[] }).genres)
          ? (s as { genres?: string[] }).genres!
          : []),
        ...(s.tags || []),
        typeof s.genre === "string" ? s.genre : "",
      ];
      return g.filter(Boolean);
    }),
  ]
    .map((g) => g.trim())
    .filter(Boolean);
  const uniqueGenres = [...new Set(genreHints)].slice(0, 6);
  const excludeQ = [...exclude].join(",");

  const jobs: { name: string; url: string; source: CandidateSource }[] = [
    {
      name: "challenge_pool",
      url: "/api/challenge-pool",
      source: "challenge_pool",
    },
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

  if (uniqueGenres.length) {
    jobs.push({
      name: "recommend_genres",
      url: `/api/recommend?mode=popular&genres=${encodeURIComponent(uniqueGenres.join(","))}&exclude=${excludeQ}`,
      source: "recommend_genres",
    });
  }

  const settled = await Promise.allSettled([
    ...seedJobs,
    ...jobs.map(async (j) => {
      attempted.push(j.name);
      const { data } = await pullJson(j.url);
      ingest(data, j.source);
    }),
  ]);
  void settled;

  if (opts.personal?.length) {
    ingest(
      opts.personal.filter((a) => !exclude.has(a.id)),
      "personal",
    );
  }

  const candidates = [...byId.values()].slice(0, limit);
  return {
    candidates,
    providersAttempted: attempted,
    uniqueCandidateCount: candidates.length,
  };
}
