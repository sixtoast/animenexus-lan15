/**
 * One fingerprint per candidate per request.
 * Priority: AI-enriched cache → multi-provider labels → AniList semantic → local fallback.
 */
import type { Anime } from "@/lib/types";
import {
  identityFromAnime,
  ensureNexusId,
} from "@/lib/anime-identity";
import type { AnimePreferenceFingerprint } from "./anime-preference-fingerprint";
import type { FingerprintConfidence } from "./anime-preference-fingerprint";
import { buildEnrichedFingerprint } from "./fingerprint-enrichment";
import {
  getCachedFingerprint,
  getCachedFingerprintByKey,
} from "./fingerprint-cache";

export type ResolvedFingerprintSource =
  | "ai_enriched_cache"
  | "multi_provider"
  | "anilist_semantic"
  | "local_fallback";

export type ResolvedFingerprint = {
  fingerprint: AnimePreferenceFingerprint;
  confidence: FingerprintConfidence;
  source: ResolvedFingerprintSource;
  nexusId: string;
};

function hasAiProvenance(fp: AnimePreferenceFingerprint): boolean {
  const sources = fp.provenance?.sources || [];
  return sources.some(
    (s) =>
      String(s).includes("ai") ||
      String(s) === "ai_inference" ||
      String(s).includes("ai-enrich"),
  );
}

function hasDeepProvenance(fp: AnimePreferenceFingerprint): boolean {
  const sources = fp.provenance?.sources || [];
  return sources.some(
    (s) =>
      s === "deep-tags" ||
      String(s).includes("provider") ||
      String(s).includes("jikan") ||
      String(s).includes("kitsu"),
  );
}

/**
 * Resolve the best available fingerprint for ranking / pre-rank.
 * Prefer nexusId cache keys; fall back to numeric anime.id for legacy cache.
 */
export function getBestAvailableFingerprint(
  anime: Anime,
  opts?: {
    cache?: Map<string, AnimePreferenceFingerprint>;
    extraLabels?: string[];
  },
): ResolvedFingerprint {
  const identity = ensureNexusId(identityFromAnime(anime));
  const nexusId = identity.nexusId || `anilist:${anime.id}`;

  if (opts?.cache?.has(nexusId)) {
    const fp = opts.cache.get(nexusId)!;
    const source: ResolvedFingerprintSource = hasAiProvenance(fp)
      ? "ai_enriched_cache"
      : hasDeepProvenance(fp)
        ? "multi_provider"
        : "anilist_semantic";
    return { fingerprint: fp, confidence: fp.confidence, source, nexusId };
  }

  const byNexus = getCachedFingerprintByKey(nexusId);
  if (byNexus) {
    const source: ResolvedFingerprintSource = hasAiProvenance(byNexus)
      ? "ai_enriched_cache"
      : hasDeepProvenance(byNexus)
        ? "multi_provider"
        : "anilist_semantic";
    return {
      fingerprint: byNexus,
      confidence: byNexus.confidence,
      source,
      nexusId,
    };
  }

  const byId = getCachedFingerprint(anime.id);
  if (byId) {
    const source: ResolvedFingerprintSource = hasAiProvenance(byId)
      ? "ai_enriched_cache"
      : hasDeepProvenance(byId)
        ? "multi_provider"
        : "anilist_semantic";
    return {
      fingerprint: byId,
      confidence: byId.confidence,
      source,
      nexusId,
    };
  }

  const hasTagDetails = Boolean(anime.tagDetails?.length);
  const fp = buildEnrichedFingerprint(anime, {
    deepTagNames: opts?.extraLabels,
  });
  const source: ResolvedFingerprintSource = hasTagDetails
    ? "anilist_semantic"
    : opts?.extraLabels?.length
      ? "multi_provider"
      : "local_fallback";

  return {
    fingerprint: fp,
    confidence: fp.confidence,
    source,
    nexusId,
  };
}
