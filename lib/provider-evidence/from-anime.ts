import type { Anime } from "@/lib/types";
import type {
  AnimeSemanticEvidence,
  EvidenceSource,
  SemanticTerm,
} from "./types";
import { sourceFamilyOf } from "./source-family";
import { EVIDENCE_SCHEMA_VERSION } from "./types";

function baseSource(anime: Anime): EvidenceSource {
  const s = String(anime.source || "").toLowerCase();
  if (s.includes("jikan") || s.includes("mal")) return "jikan";
  if (s.includes("kitsu")) return "kitsu";
  if (s.includes("shiki")) return "shikimori";
  if (s.includes("simkl")) return "simkl";
  return "anilist";
}

/**
 * Build Class-A semantic evidence from an already-mapped Anime row.
 * Preserves ranked AniList-style tags when present on the object as
 * `tagRanks` (optional extension) or equal-weight string tags.
 */
export function semanticEvidenceFromAnime(
  anime: Anime,
  opts?: {
    tagRanks?: { name: string; rank?: number }[];
    themes?: string[];
    demographics?: string[];
    categories?: string[];
  },
): AnimeSemanticEvidence {
  const src = baseSource(anime);
  const family = sourceFamilyOf(src);
  const terms: SemanticTerm[] = [];

  const genres = [
    ...(anime.genre && anime.genre !== "N/A" ? [anime.genre] : []),
    ...((anime.tags || []).filter(
      (t) => t && t !== anime.genre,
    ) as string[]),
  ];
  if (opts?.tagRanks?.length) {
    for (const tg of opts.tagRanks) {
      if (!tg.name) continue;
      terms.push({
        name: tg.name,
        kind: "tag",
        source: "anilist",
        sourceFamily: "anilist",
        providerRelevance:
          typeof tg.rank === "number" ? Math.max(0, Math.min(1, tg.rank / 100)) : null,
      });
    }
  } else {
    for (const g of genres) {
      terms.push({
        name: g,
        kind: "genre",
        source: src,
        sourceFamily: family,
        providerRelevance: null,
      });
    }
  }

  for (const th of opts?.themes || []) {
    terms.push({
      name: th,
      kind: "theme",
      source: "jikan",
      sourceFamily: "mal",
      providerRelevance: null,
    });
  }
  for (const d of opts?.demographics || []) {
    terms.push({
      name: d,
      kind: "demographic",
      source: "jikan",
      sourceFamily: "mal",
      providerRelevance: null,
    });
  }
  for (const c of opts?.categories || []) {
    terms.push({
      name: c,
      kind: "category",
      source: "kitsu",
      sourceFamily: "kitsu",
      providerRelevance: null,
    });
  }

  const year =
    typeof anime.year === "number"
      ? anime.year
      : parseInt(String(anime.year || ""), 10) || undefined;
  const eps =
    typeof anime.episodes === "number"
      ? anime.episodes
      : parseInt(String(anime.episodes || ""), 10) || undefined;

  const scoreRaw = typeof anime.score === "number" ? anime.score : 0;
  const score01 =
    scoreRaw > 10 ? Math.min(1, scoreRaw / 100) : Math.min(1, scoreRaw / 10);

  return {
    identity: {
      anilistId: anime.anilist_id || anime.id || null,
      malId: anime.idMal ?? null,
      title: anime.title,
    },
    titles: {
      english: anime.title,
      romaji: anime.titleRomaji,
      native: anime.titleNative,
    },
    descriptions: anime.description
      ? [{ source: src, text: anime.description }]
      : [],
    terms,
    structure: {
      format: anime.format,
      episodes: Number.isFinite(eps) ? eps : undefined,
      durationMinutes:
        typeof anime.duration === "number" && anime.duration > 0
          ? anime.duration
          : undefined,
      status: anime.status,
      year: Number.isFinite(year) ? year : undefined,
    },
    production: {
      studios: [],
      producers: [],
      licensors: [],
      mainStaff: [],
    },
    community: {
      anilist:
        src === "anilist"
          ? {
              score01,
              popularity: anime.popularity || null,
            }
          : undefined,
      mal:
        family === "mal"
          ? { score01, popularity: anime.popularity || null }
          : undefined,
    },
    relations: [],
    recommendations: [],
    provenance: [
      {
        source: src,
        sourceFamily: family,
        fetchedAt: new Date().toISOString(),
        ok: true,
      },
    ],
  };
}

export function evidenceSchemaVersion(): string {
  return EVIDENCE_SCHEMA_VERSION;
}
