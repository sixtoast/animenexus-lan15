/**
 * Universal anime identity (Multi-API + Expansion II Sprint 1).
 *
 * AniList id is the primary internal identifier for catalog titles.
 * External ids are mappings with provenance — never replace AniList ids.
 * Title matching is last-resort and must not become silent authoritative mapping.
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
  | "tvdb"
  | "imdb"
  | "anidb"
  | "simkl"
  | "watchmode"
  | "animethemes"
  | "wikidata"
  | "mangadex"
  | "fanart";

export type MappingMethod =
  | "anilist_field" // e.g. Media.idMal
  | "provider_native" // row came from that provider
  | "offset_decode" // extracted from offset id scheme
  | "external_resource" // e.g. AnimeThemes Anilist resource
  | "mapping_dataset" // verified cross-id dataset
  | "multi_id_agree" // several sources agree
  | "title_match" // LAST RESORT — never treat as permanent authority alone
  | "manual"
  | "import";

/** Preferred resolution order (high → low). Title match is always last. */
export const IDENTITY_RESOLUTION_ORDER: MappingMethod[] = [
  "anilist_field",
  "provider_native",
  "external_resource",
  "mapping_dataset",
  "multi_id_agree",
  "import",
  "manual",
  "offset_decode",
  "title_match",
];

export type IdentityMapping = {
  source: IdentityProvider;
  target: IdentityProvider;
  /** String so TMDB / Wikidata / IMDb / slugs stay uniform */
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
  tvdbId?: string;
  imdbId?: string;
  anidbId?: number;
  simklId?: string;
  watchmodeId?: string;
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

/** Title-match mappings must stay provisional (cap confidence). */
export function isAuthoritativeMapping(m: IdentityMapping): boolean {
  if (m.method === "title_match") return false;
  return m.confidence >= 0.85;
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

  if (anime.id >= SHIKI_ID_OFFSET) {
    const native = anime.id - SHIKI_ID_OFFSET;
    origin = "shikimori";
    confidence.shikimori = 1;
    mappings.push(
      mapping("shikimori", "shikimori", native, 1, "offset_decode"),
    );
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

  origin = (anime.source as IdentityProvider) || "anilist";
  if (
    origin !== "anilist" &&
    origin !== "kitsu" &&
    origin !== "shikimori" &&
    origin !== "mal"
  ) {
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
    mappings.push(mapping("anilist", "mal", malId, 1, "anilist_field"));
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
    mappings.push(mapping("mal", "anilist", anilistId, 0.9, "import"));
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

export function preferredCatalogId(identity: AnimeIdentity): number | null {
  return identity.anilistId;
}

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
  const candidates = identity.mappings.filter((m) => m.target === target);
  if (!candidates.length) return undefined;
  // Prefer higher confidence; break ties by resolution order
  return candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (
      IDENTITY_RESOLUTION_ORDER.indexOf(a.method) -
      IDENTITY_RESOLUTION_ORDER.indexOf(b.method)
    );
  })[0];
}

export function withMapping(
  identity: AnimeIdentity,
  map: IdentityMapping,
): AnimeIdentity {
  // Never promote title_match over an existing authoritative mapping for same target
  if (map.method === "title_match") {
    const existing = getMapping(identity, map.target);
    if (existing && isAuthoritativeMapping(existing)) {
      return {
        ...identity,
        mappings: [
          ...identity.mappings.filter(
            (m) =>
              !(
                m.target === map.target &&
                m.source === map.source &&
                m.method === "title_match"
              ),
          ),
          map,
        ],
      };
    }
  }

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

  // Only write canonical id fields for non-provisional or high-confidence maps
  const writeField =
    map.method !== "title_match" || map.confidence >= 0.95;

  if (writeField) {
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
      case "tvdb":
        next.tvdbId = map.targetId;
        break;
      case "imdb":
        next.imdbId = map.targetId;
        break;
      case "anidb":
        if (!Number.isNaN(idNum)) next.anidbId = idNum;
        break;
      case "simkl":
        next.simklId = map.targetId;
        break;
      case "watchmode":
        next.watchmodeId = map.targetId;
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
  }
  return next;
}

/** Helper to attach a mapping with explicit method (providers should use this). */
export function mapId(
  identity: AnimeIdentity,
  opts: {
    source: IdentityProvider;
    target: IdentityProvider;
    targetId: string | number;
    confidence: number;
    method: MappingMethod;
  },
): AnimeIdentity {
  return withMapping(
    identity,
    mapping(opts.source, opts.target, opts.targetId, opts.confidence, opts.method),
  );
}
