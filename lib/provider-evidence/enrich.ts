/**
 * Stage-C style enrichment: optional secondary providers for known IDs.
 * Soft-fail; never aborts ranking.
 */
import type { Anime } from "@/lib/types";
import { fetchJikanFullAnime } from "@/lib/providers/jikan";
import {
  semanticEvidenceFromAnime,
  type AnimeSemanticEvidence,
} from "./from-anime";
import type { SemanticTerm } from "./types";
import { getEvidenceBundle, setEvidenceBundle } from "./bundle-cache";
import { EVIDENCE_SCHEMA_VERSION } from "./types";

function pushUnique(
  terms: SemanticTerm[],
  term: SemanticTerm,
): void {
  const key = `${term.sourceFamily}:${term.kind}:${term.name.toLowerCase()}`;
  if (
    terms.some(
      (t) =>
        `${t.sourceFamily}:${t.kind}:${t.name.toLowerCase()}` === key,
    )
  ) {
    return;
  }
  terms.push(term);
}

/** Enrich one anime with Jikan full row when MAL id is known. Cached. */
export async function enrichAnimeEvidence(
  anime: Anime,
): Promise<AnimeSemanticEvidence> {
  const cached = getEvidenceBundle(anime.idMal, anime.anilist_id || anime.id);
  if (cached?.semanticEvidence) return cached.semanticEvidence;

  const tagRanks = (anime.tagDetails || [])
    .filter((t) => t.name)
    .map((t) => ({ name: t.name, rank: t.rank ?? undefined }));

  let evidence = semanticEvidenceFromAnime(anime, {
    tagRanks: tagRanks.length ? tagRanks : undefined,
  });

  const malId = anime.idMal;
  if (malId && malId > 0) {
    try {
      const full = await fetchJikanFullAnime(malId);
      if (full) {
        for (const g of full.genres) {
          pushUnique(evidence.terms, {
            name: g.name,
            kind: "genre",
            source: "jikan",
            sourceFamily: "mal",
            providerId: g.malId ?? null,
            providerRelevance: null,
          });
        }
        for (const g of full.explicitGenres) {
          pushUnique(evidence.terms, {
            name: g.name,
            kind: "genre",
            source: "jikan",
            sourceFamily: "mal",
            providerId: g.malId ?? null,
            providerRelevance: null,
          });
        }
        for (const th of full.themes) {
          pushUnique(evidence.terms, {
            name: th.name,
            kind: "theme",
            source: "jikan",
            sourceFamily: "mal",
            providerId: th.malId ?? null,
            providerRelevance: null,
          });
        }
        for (const d of full.demographics) {
          pushUnique(evidence.terms, {
            name: d.name,
            kind: "demographic",
            source: "jikan",
            sourceFamily: "mal",
            providerId: d.malId ?? null,
            providerRelevance: null,
          });
        }
        if (full.synopsis) {
          evidence.descriptions.push({
            source: "jikan",
            text: full.synopsis,
          });
        }
        evidence.production.studios = [
          ...new Set([
            ...evidence.production.studios,
            ...full.studios,
          ]),
        ];
        evidence.production.producers = [
          ...new Set([
            ...evidence.production.producers,
            ...full.producers,
          ]),
        ];
        evidence.production.licensors = [
          ...new Set([
            ...evidence.production.licensors,
            ...full.licensors,
          ]),
        ];
        if (full.score != null) {
          evidence.community.mal = {
            ...(evidence.community.mal || {}),
            score01: Math.min(1, full.score / 10),
            votes: full.scoredBy ?? null,
            popularity: full.popularity ?? null,
            favourites: full.favorites ?? null,
            rank: full.rank ?? null,
          };
        }
        if (full.episodes && !evidence.structure.episodes) {
          evidence.structure.episodes = full.episodes;
        }
        if (full.source) {
          evidence.structure.sourceMaterial = full.source;
        }
        if (full.year && !evidence.structure.year) {
          evidence.structure.year = full.year;
        }
        evidence.provenance.push({
          source: "jikan",
          sourceFamily: "mal",
          fetchedAt: new Date().toISOString(),
          ok: true,
        });
      }
    } catch (e) {
      evidence.provenance.push({
        source: "jikan",
        sourceFamily: "mal",
        fetchedAt: new Date().toISOString(),
        ok: false,
        error: e instanceof Error ? e.message : "jikan enrich failed",
      });
    }
  }

  setEvidenceBundle({
    identity: evidence.identity,
    semanticEvidence: evidence,
    fetchedAt: { jikan: new Date().toISOString() },
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
  });
  return evidence;
}

/**
 * Merge high-relevance theme/tag names into anime.tags for fingerprinting
 * without inventing data — only names already returned by providers.
 */
export function applyEvidenceTagsToAnime(
  anime: Anime,
  evidence: AnimeSemanticEvidence,
): Anime {
  const names = new Set(
    (anime.tags || []).map((t) => t.toLowerCase()),
  );
  const extra: string[] = [];
  for (const term of evidence.terms) {
    if (term.kind === "theme" || term.kind === "tag" || term.kind === "demographic") {
      const n = term.name.trim();
      if (!n || names.has(n.toLowerCase())) continue;
      names.add(n.toLowerCase());
      extra.push(n);
    }
  }
  if (!extra.length) return anime;
  return {
    ...anime,
    tags: [...(anime.tags || []), ...extra],
  };
}
