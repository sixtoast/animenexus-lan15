/**
 * AniDB HTTP API — niche metadata only (API Expansion II Sprint 4).
 * Does NOT replace AniList as catalog core.
 *
 * Requires registered client: ANIDB_CLIENT + ANIDB_CLIENTVER
 * Docs: https://wiki.anidb.net/HTTP_API_Definition
 * Rate limit: ~1 request / 2s — enforced via withProviderLimit + long cache.
 */

import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";
import type { AnimeIdentity } from "../anime-identity";
import { mapId } from "../anime-identity";
import type {
  AlternativeTitle,
  AnimeDeepMetadata,
  DeepRelation,
  DeepTag,
} from "../deep-metadata";
import { emptyDeepMetadata, nowProvenance } from "../deep-metadata";

const BASE = "http://api.anidb.net:9001/httpapi";

export function isAniDbConfigured(): boolean {
  return Boolean(
    process.env.ANIDB_CLIENT?.trim() && process.env.ANIDB_CLIENTVER?.trim(),
  );
}

function clientParams(): URLSearchParams | null {
  const client = process.env.ANIDB_CLIENT?.trim().toLowerCase();
  const clientver = process.env.ANIDB_CLIENTVER?.trim();
  if (!client || !clientver) return null;
  return new URLSearchParams({
    client,
    clientver,
    protover: "1",
  });
}

async function anidbFetch(params: URLSearchParams): Promise<string | null> {
  if (!isAniDbConfigured()) return null;
  return withProviderLimit("anidb", async () => {
    try {
      const url = `${BASE}?${params}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/xml,text/xml,*/*",
          "User-Agent": "AnimeNexusLantern/1.0 (contact: site owner)",
        },
        // AniDB is sensitive to volume — long cache preferred
        next: { revalidate: 86_400 },
      });
      if (!res.ok) {
        console.warn("[anidb] HTTP", res.status);
        return null;
      }
      return await res.text();
    } catch (e) {
      console.warn("[anidb]", e instanceof Error ? e.message : e);
      return null;
    }
  });
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
  return m?.[1];
}

function decodeXml(s: string): string {
  return s
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/&/g, "&");
}

function parseTitles(xml: string): AlternativeTitle[] {
  const titles: AlternativeTitle[] = [];
  const re = /<title\b([^>]*)>([^<]*)<\/title>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const text = decodeXml(m[2]).trim();
    if (!text) continue;
    titles.push({
      title: text,
      language: attr(attrs, "xml:lang") || attr(attrs, "lang"),
      type: attr(attrs, "type") || "unknown",
      source: "anidb",
      provenance: nowProvenance("anidb", 1, "http_anime"),
    });
  }
  return titles;
}

function parseTags(xml: string): DeepTag[] {
  const tags: DeepTag[] = [];
  // <tag id="…" weight="…" localspoiler="true">…<name>…</name><description>…
  const blockRe = /<tag\b([^>]*)>([\s\S]*?)<\/tag>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml))) {
    const attrs = m[1];
    const body = m[2];
    const nameM = body.match(/<name>([^<]*)<\/name>/i);
    const descM = body.match(/<description>([^<]*)<\/description>/i);
    const name = nameM ? decodeXml(nameM[1]).trim() : "";
    if (!name) continue;
    const weightStr = attr(attrs, "weight");
    const spoiler =
      attr(attrs, "localspoiler") === "true" ||
      attr(attrs, "spoiler") === "true";
    tags.push({
      name,
      description: descM ? decodeXml(descM[1]).trim() : undefined,
      weight: weightStr ? parseInt(weightStr, 10) : undefined,
      spoiler,
      source: "anidb",
      provenance: nowProvenance("anidb", 1, "http_anime"),
    });
  }
  return tags;
}

function parseRelations(xml: string): DeepRelation[] {
  const relations: DeepRelation[] = [];
  // <relatedanime><anime id="…" type="Sequel">Title</anime>
  const re = /<anime\b([^>]*)>([^<]*)<\/anime>/gi;
  const relatedSection = xml.match(
    /<relatedanime[\s\S]*?<\/relatedanime>/i,
  )?.[0];
  if (!relatedSection) return relations;
  let m: RegExpExecArray | null;
  while ((m = re.exec(relatedSection))) {
    const id = attr(m[1], "id");
    const type = attr(m[1], "type") || "related";
    if (!id) continue;
    relations.push({
      externalTargetId: id,
      externalTargetSource: "anidb",
      relationType: type,
      source: "anidb",
      confidence: 0.9,
      provenance: nowProvenance("anidb", 0.9, "http_anime"),
    });
  }
  return relations;
}

function parseEpisodeCount(xml: string): number | undefined {
  const m = xml.match(/<episodecount>(\d+)<\/episodecount>/i);
  return m ? parseInt(m[1], 10) : undefined;
}

function parseAid(xml: string): number | null {
  const m = xml.match(/<anime\b[^>]*\bid=["'](\d+)["']/i);
  return m ? parseInt(m[1], 10) : null;
}

export type AniDbAnimePayload = {
  aid: number;
  titles: AlternativeTitle[];
  tags: DeepTag[];
  relations: DeepRelation[];
  episodeCount?: number;
  rawXmlLength: number;
};

export function parseAniDbAnimeXml(xml: string): AniDbAnimePayload | null {
  if (!xml || /<error/i.test(xml)) return null;
  const aid = parseAid(xml);
  if (!aid) return null;
  return {
    aid,
    titles: parseTitles(xml),
    tags: parseTags(xml),
    relations: parseRelations(xml),
    episodeCount: parseEpisodeCount(xml),
    rawXmlLength: xml.length,
  };
}

/** Fetch AniDB anime by AID → cache 24h. */
export async function fetchAniDbByAid(
  aid: number,
): Promise<AniDbAnimePayload | null> {
  if (!aid || aid < 1 || !isAniDbConfigured()) return null;
  const base = clientParams();
  if (!base) return null;

  const key = cacheKey(["anidb", "aid", aid]);
  return dedupedFetch(
    key,
    async () => {
      const params = new URLSearchParams(base);
      params.set("request", "anime");
      params.set("aid", String(aid));
      const xml = await anidbFetch(params);
      if (!xml) return null;
      return parseAniDbAnimeXml(xml);
    },
    CACHE_TTL.identity,
  ).catch(() => null);
}

/** Map AniDB payload into deep metadata + optional identity patch. */
export function anidbToDeepMetadata(
  payload: AniDbAnimePayload,
  anilistId: number | null,
): AnimeDeepMetadata {
  const deep = emptyDeepMetadata(anilistId);
  deep.titles = payload.titles;
  deep.tags = payload.tags;
  deep.relations = payload.relations;
  if (payload.episodeCount != null) {
    deep.episodeStructure = {
      mainCount: payload.episodeCount,
      source: "anidb",
      provenance: nowProvenance("anidb", 0.9, "http_anime"),
    };
  }
  deep.provenance.push(nowProvenance("anidb", 1, "http_anime"));
  deep.externalResources.push({
    label: "AniDB",
    url: `https://anidb.net/anime/${payload.aid}`,
    site: "anidb",
    source: "anidb",
    provenance: nowProvenance("anidb", 1),
  });
  return deep;
}

/** Attach anidbId mapping when we trust the AID. */
export function identityWithAniDb(
  identity: AnimeIdentity,
  aid: number,
  confidence = 0.95,
): AnimeIdentity {
  return mapId(identity, {
    source: "anidb",
    target: "anidb",
    targetId: aid,
    confidence,
    method: "provider_native",
  });
}

/** Soft entry: resolve deep metadata if identity already has anidbId. */
export async function enrichDeepFromAniDb(
  identity: AnimeIdentity,
): Promise<AnimeDeepMetadata | null> {
  if (!identity.anidbId || !isAniDbConfigured()) return null;
  const payload = await fetchAniDbByAid(identity.anidbId);
  if (!payload) return null;
  return anidbToDeepMetadata(payload, identity.anilistId);
}
