/**
 * Niche / deep metadata model (API Expansion II Sprint 2).
 * Separate from core Anime catalog rows — never flatten into Anime.
 * Every fact is expected to carry provenance (Sprint 3 tightens enforcement).
 */

export type MetadataConfidenceLabel =
  | "verified"
  | "strong"
  | "inferred"
  | "uncertain";

export type MetadataProvenance = {
  source: string;
  /** 0–1 when known */
  confidence?: number;
  confidenceLabel?: MetadataConfidenceLabel;
  retrievedAt: string; // ISO
  method?: string;
  note?: string;
};

export type AlternativeTitle = {
  title: string;
  language?: string;
  /** official | synonym | short | native | … */
  type?: string;
  source: string;
  provenance?: MetadataProvenance;
};

export type DeepTag = {
  name: string;
  namespace?: string;
  description?: string;
  /** AniDB-style weight when available */
  weight?: number;
  spoiler?: boolean;
  source: string;
  provenance?: MetadataProvenance;
};

export type DeepRelation = {
  /** AniList id when resolved */
  targetAnimeId?: number;
  externalTargetId?: string;
  externalTargetSource?: string;
  relationType: string;
  source: string;
  confidence: number;
  provenance?: MetadataProvenance;
};

export type CreatorCredit = {
  name: string;
  role: string;
  personId?: string;
  source: string;
  provenance?: MetadataProvenance;
};

export type CharacterCredit = {
  name: string;
  role?: string;
  image?: string;
  characterId?: string;
  source: string;
  provenance?: MetadataProvenance;
};

export type ProductionCredit = {
  name: string;
  role: string;
  studio?: boolean;
  source: string;
  provenance?: MetadataProvenance;
};

export type ExternalResource = {
  label: string;
  url: string;
  site?: string;
  source: string;
  provenance?: MetadataProvenance;
};

export type EpisodeStructure = {
  mainCount?: number;
  specialCount?: number;
  ovaCount?: number;
  notes?: string;
  /** When sources disagree, list all observed values */
  disagreements?: { field: string; values: { source: string; value: string }[] }[];
  source: string;
  provenance?: MetadataProvenance;
};

export type ArtworkAsset = {
  url: string;
  type: "poster" | "background" | "logo" | "clearart" | "banner" | "other";
  language?: string;
  width?: number;
  height?: number;
  likes?: number;
  source: string;
  provenance?: MetadataProvenance;
};

export type ArtworkCollection = {
  assets: ArtworkAsset[];
  provenance: MetadataProvenance[];
};

/**
 * Deep layer only. Core title/score/episodes stay on Anime + AniList hierarchy.
 */
export type AnimeDeepMetadata = {
  anilistId: number | null;
  titles: AlternativeTitle[];
  tags: DeepTag[];
  relations: DeepRelation[];
  creators: CreatorCredit[];
  characters: CharacterCredit[];
  production: ProductionCredit[];
  externalResources: ExternalResource[];
  episodeStructure?: EpisodeStructure;
  artwork?: ArtworkCollection;
  provenance: MetadataProvenance[];
};

export function emptyDeepMetadata(
  anilistId: number | null = null,
): AnimeDeepMetadata {
  return {
    anilistId,
    titles: [],
    tags: [],
    relations: [],
    creators: [],
    characters: [],
    production: [],
    externalResources: [],
    provenance: [],
  };
}

export function nowProvenance(
  source: string,
  confidence?: number,
  method?: string,
): MetadataProvenance {
  return {
    source,
    confidence,
    confidenceLabel: confidenceLabelFromScore(confidence),
    retrievedAt: new Date().toISOString(),
    method,
  };
}

export function confidenceLabelFromScore(
  score?: number,
): MetadataConfidenceLabel | undefined {
  if (score == null) return undefined;
  if (score >= 0.95) return "verified";
  if (score >= 0.8) return "strong";
  if (score >= 0.5) return "inferred";
  return "uncertain";
}

/** Non-spoiler tags sorted by weight desc, capped. */
export function topDeepTags(
  tags: DeepTag[],
  limit = 8,
  opts?: { allowSpoilers?: boolean },
): DeepTag[] {
  const allow = opts?.allowSpoilers ?? false;
  return [...tags]
    .filter((t) => allow || !t.spoiler)
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, limit);
}

/** Merge two deep bags without inventing links. */
export function mergeDeepMetadata(
  a: AnimeDeepMetadata,
  b: AnimeDeepMetadata,
): AnimeDeepMetadata {
  return {
    anilistId: a.anilistId ?? b.anilistId,
    titles: dedupeBy(a.titles.concat(b.titles), (t) =>
      `${t.source}|${t.type || ""}|${t.title}`.toLowerCase(),
    ),
    tags: dedupeBy(a.tags.concat(b.tags), (t) =>
      `${t.source}|${t.name}`.toLowerCase(),
    ),
    relations: a.relations.concat(b.relations),
    creators: dedupeBy(a.creators.concat(b.creators), (c) =>
      `${c.source}|${c.role}|${c.name}`.toLowerCase(),
    ),
    characters: dedupeBy(a.characters.concat(b.characters), (c) =>
      `${c.source}|${c.name}`.toLowerCase(),
    ),
    production: dedupeBy(a.production.concat(b.production), (p) =>
      `${p.source}|${p.role}|${p.name}`.toLowerCase(),
    ),
    externalResources: dedupeBy(
      a.externalResources.concat(b.externalResources),
      (r) => r.url,
    ),
    episodeStructure: a.episodeStructure || b.episodeStructure,
    artwork: mergeArtwork(a.artwork, b.artwork),
    provenance: a.provenance.concat(b.provenance),
  };
}

function dedupeBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function mergeArtwork(
  a?: ArtworkCollection,
  b?: ArtworkCollection,
): ArtworkCollection | undefined {
  if (!a && !b) return undefined;
  return {
    assets: [...(a?.assets || []), ...(b?.assets || [])],
    provenance: [...(a?.provenance || []), ...(b?.provenance || [])],
  };
}
