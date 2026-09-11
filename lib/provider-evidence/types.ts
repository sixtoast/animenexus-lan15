/**
 * Canonical multi-provider semantic evidence model.
 * Class A semantic terms stay separate from Class B community metrics.
 */

export type EvidenceSource =
  | "anilist"
  | "jikan"
  | "kitsu"
  | "shikimori"
  | "mal_official"
  | "simkl";

export type SourceFamily =
  | "anilist"
  | "mal"
  | "kitsu"
  | "shikimori"
  | "simkl";

export type SemanticTermKind =
  | "tag"
  | "theme"
  | "genre"
  | "demographic"
  | "category"
  | "keyword";

export type SemanticTerm = {
  name: string;
  kind: SemanticTermKind;
  source: EvidenceSource;
  sourceFamily: SourceFamily;
  providerId?: string | number | null;
  /** Provider-supplied relevance 0..1. Null if provider does not supply it. */
  providerRelevance?: number | null;
  description?: string | null;
  spoiler?: boolean;
};

export type CommunityEvidence = {
  score01?: number | null;
  votes?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  rank?: number | null;
  dropRate01?: number | null;
};

export type ProviderRelationEvidence = {
  relationType: string;
  title?: string;
  idMal?: number | null;
  anilistId?: number | null;
  source: EvidenceSource;
};

export type ProviderRecommendationEvidence = {
  title?: string;
  idMal?: number | null;
  anilistId?: number | null;
  rating?: number | null;
  source: EvidenceSource;
};

export type ProviderProvenance = {
  source: EvidenceSource;
  sourceFamily: SourceFamily;
  fetchedAt: string;
  ok: boolean;
  error?: string;
};

export type AnimeIdentityLite = {
  anilistId?: number | null;
  malId?: number | null;
  kitsuId?: number | null;
  title: string;
};

export type AnimeSemanticEvidence = {
  identity: AnimeIdentityLite;
  titles: {
    english?: string;
    romaji?: string;
    native?: string;
    synonyms?: string[];
  };
  descriptions: { source: EvidenceSource; text: string }[];
  terms: SemanticTerm[];
  structure: {
    format?: string;
    episodes?: number;
    durationMinutes?: number;
    sourceMaterial?: string;
    status?: string;
    season?: string;
    year?: number;
    ageRating?: string;
  };
  production: {
    studios: string[];
    producers: string[];
    licensors: string[];
    mainStaff: string[];
  };
  community: {
    anilist?: CommunityEvidence;
    mal?: CommunityEvidence;
    kitsu?: CommunityEvidence;
    shikimori?: CommunityEvidence;
    simkl?: CommunityEvidence;
  };
  relations: ProviderRelationEvidence[];
  recommendations: ProviderRecommendationEvidence[];
  provenance: ProviderProvenance[];
};

export type EnvironmentalSessionContext = {
  isDay?: boolean;
  temperatureC?: number;
  apparentTemperatureC?: number;
  humidity?: number;
  precipitation?: number;
  cloudCover?: number;
  weatherCode?: number;
};

/** Max weather influence on normalised 0..1 score. */
export const MAX_WEATHER_CONTEXT_ADJUSTMENT = 0.025;

export type ProviderEvidenceBundle = {
  identity: AnimeIdentityLite;
  semanticEvidence: AnimeSemanticEvidence;
  fetchedAt: Record<string, string>;
  schemaVersion: string;
};

export const EVIDENCE_SCHEMA_VERSION = "1.0.0";
