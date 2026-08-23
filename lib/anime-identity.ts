/**
 * Universal anime identity (Multi-API Sprint 1).
 *
 * AniList id is the primary internal identifier for catalog titles.
 * External ids are mappings with provenance — never replace AniList ids.
 */

import type { Anime } from "./types";
import { KITSU_ID_OFFSET } from "./providers/kitsu";
import { SHIKI_ID_OFFSET } from "./providers/shikimori";

export type IdentityProvider =
  | "anilist"
  | "mal"
  | "kitsu"
  | "shikimori"
  | "tmdb"
  | "anidb"
  | "animethemes"
  | "wikidata"
  | "mangadex";

export type MappingMethod =
  | "anilist_field" // e.g. Media.idMal
  | "provider_native" // row came from that provider
  | "offset_decode" // extracted from offset id scheme
  | "external_resource" // e.g. AnimeThemes Anilist resource
  | "title_match"
  | "manual"
  | "import";

export type IdentityMapping = {
  source: IdentityProvider;
  target: IdentityProvider;
  /** String so TMDB / Wikidata / slugs stay uniform */
  targetId: string;
  confidence: number; // 0–1
  method: MappingMethod;
  timestamp: string; // ISO
};

export type AnimeIdentity = {
  /** Primary catalog key — AniList when known */
  anilistId: number | null;

  malId?: number;
  tmdbId?: string;
  anidbId?: number;
  animeThemesId?: string;
  kitsuId?: string;
  shikimoriId?: string;
  mangadexId?: string;
  wikidataId?: string;

  titles: {
    romaji?: string;
    english?: string;
    native?: string;
  };

  /** Per-provider confidence for the stored id fields */
  confidence: Partial<Record<IdentityProvider, number>>;

  /** Full mapping audit trail */
  mappings: IdentityMapping[];

  /** How the row entered the system */
  origin: IdentityProvider;
};

function nowIso() {
  return new Date().toISOString();
}

function mapping(
  source: IdentityProvider,
  target: IdentityProvider,
  targetId: string | number,
  confidence: number,
  method: MappingMethod,
): IdentityMapping {
  return {
    source,
    target,
    targetId: String(targetId),
    confidence,
    method,
    timestamp: nowIso(),
  };
}

/**
 * Build identity from a normalized Anime row.
 * Prefers authoritative fields (idMal, source) over title matching.
 */
export function identityFromAnime(anime: Anime): AnimeIdentity {
  const mappings: IdentityMapping[] = [];
  const confidence: AnimeIdentity["confidence"] = {};
  let anilistId: number | null = null;
  let origin: IdentityProvider = "anilist";

  const titles = {
    english: anime.title || undefined,
    romaji: anime.titleRomaji,
    native: anime.titleNative,
  };

  // Decode offset ids first
  if (anime.id >= SHIKI_ID_OFFSET) {
    const native = anime.id - SHIKI_ID_OFFSET;
    origin = "shikimori";
    confidence.shikimori = 1;
    mappings.push(
      mapping("shikimori", "shikimori", native, 1, "offset_decode"),
    );
    // anilist_id may still be set if ever bridged
    if (anime.anilist_id && anime.anilist_id > 0) {
      anilistId = anime.anilist_id;
      confidence.anilist = 0.7;
      mappings.push(
        mapping("shikimori", "anilist", anilistId, 0.7, "provider_native"),
      );
    }
    return {
      anilistId,
      shikimoriId: String(native),
      malId: anime.idMal && anime.idMal > 0 ? anime.idMal : undefined,
      titles,
      confidence,
      mappings,
      origin,
    };
  }

  if (anime.id >= KITSU_ID_OFFSET) {
    const native = anime.id - KITSU_ID_OFFSET;
    origin = "kitsu";
    confidence.kitsu = 1;
    mappings.push(mapping("kitsu", "kitsu", native, 1, "offset_decode"));
    if (anime.anilist_id && anime.anilist_id > 0) {
      anilistId = anime.anilist_id;
      confidence.anilist = 0.7;
      mappings.push(
        mapping("kitsu", "anilist", anilistId, 0.7, "provider_native"),
      );
    }
    return {
      anilistId,
      kitsuId: String(native),
      malId: anime.idMal && anime.idMal > 0 ? anime.idMal : undefined,
      titles,
      confidence,
      mappings,
      origin,
    };
  }

  // AniList-native id space
  origin = (anime.source as IdentityProvider) || "anilist";
  if (origin !== "anilist" && origin !== "kitsu" && origin !== "shikimori") {
    origin = "anilist";
  }

  anilistId =
    anime.anilist_id && anime.anilist_id > 0
      ? anime.anilist_id
      : anime.id > 0
        ? anime.id
        : null;

  if (anilistId) {
    confidence.anilist = 1;
    mappings.push(
      mapping("anilist", "anilist", anilistId, 1, "provider_native"),
    );
  }

  let malId: number | undefined;
  if (anime.idMal && anime.idMal > 0) {
    malId = anime.idMal;
    confidence.mal = 1;
    mappings.push(
      mapping("anilist", "mal", malId, 1, "anilist_field"),
    );
  }

  return {
    anilistId,
    malId,
    titles,
    confidence,
    mappings,
    origin,
  };
}

/** Identity for a MAL-only import row (watchlist merge helper). */
export function identityFromMalImport(opts: {
  malId: number;
  title: string;
  anilistId?: number | null;
}): AnimeIdentity {
  const mappings: IdentityMapping[] = [
    mapping("mal", "mal", opts.malId, 1, "import"),
  ];
  const confidence: AnimeIdentity["confidence"] = { mal: 1 };
  let anilistId: number | null = null;
  if (opts.anilistId && opts.anilistId > 0) {
    anilistId = opts.anilistId;
    confidence.anilist = 0.9;
    mappings.push(
      mapping("mal", "anilist", anilistId, 0.9, "import"),
    );
  }
  return {
    anilistId,
    malId: opts.malId,
    titles: { english: opts.title },
    confidence,
    mappings,
    origin: "mal",
  };
}

/** Preferred route / storage id: AniList when known. */
export function preferredCatalogId(identity: AnimeIdentity): number | null {
  return identity.anilistId;
}

/** True when watchlist id is likely a raw MAL id without AniList bridge. */
export function isUnresolvedMalOnly(identity: AnimeIdentity): boolean {
  return (
    identity.origin === "mal" &&
    identity.malId != null &&
    identity.anilistId == null
  );
}

export function getMapping(
  identity: AnimeIdentity,
  target: IdentityProvider,
): IdentityMapping | undefined {
  return identity.mappings.find((m) => m.target === target);
}

export function withMapping(
  identity: AnimeIdentity,
  map: IdentityMapping,
): AnimeIdentity {
  const next: AnimeIdentity = {
    ...identity,
    mappings: [
      ...identity.mappings.filter(
        (m) => !(m.target === map.target && m.source === map.source),
      ),
      map,
    ],
    confidence: {
      ...identity.confidence,
      [map.target]: map.confidence,
    },
  };

  const idNum = Number(map.targetId);
  switch (map.target) {
    case "anilist":
      if (!Number.isNaN(idNum)) next.anilistId = idNum;
      break;
    case "mal":
      if (!Number.isNaN(idNum)) next.malId = idNum;
      break;
    case "kitsu":
      next.kitsuId = map.targetId;
      break;
    case "shikimori":
      next.shikimoriId = map.targetId;
      break;
    case "tmdb":
      next.tmdbId = map.targetId;
      break;
    case "anidb":
      if (!Number.isNaN(idNum)) next.anidbId = idNum;
      break;
    case "animethemes":
      next.animeThemesId = map.targetId;
      break;
    case "wikidata":
      next.wikidataId = map.targetId;
      break;
    case "mangadex":
      next.mangadexId = map.targetId;
      break;
    default:
      break;
  }
  return next;
}
