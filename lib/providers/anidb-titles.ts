/**
 * AniDB title intelligence (API Expansion II Sprint 5).
 *
 * Public dump: https://anidb.net/api/anime-titles.xml.gz
 * Refresh: process-local + cache TTL 7 days. Never hit dump per keystroke.
 */

import { gunzipSync } from "zlib";
import { cacheGet, cacheKey, cacheSet } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";

const DUMP_URL = "https://anidb.net/api/anime-titles.xml.gz";
const DUMP_TTL_MS = 7 * 86_400_000;
const INDEX_KEY = cacheKey(["anidb", "titles-index", "v1"]);

export type AniDbTitleHit = {
  aid: number;
  title: string;
  type: string;
  lang?: string;
};

type TitleIndex = {
  byNorm: Map<string, AniDbTitleHit[]>;
  builtAt: string;
  entryCount: number;
};

let memoryIndex: TitleIndex | null = null;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function decodeXml(s: string): string {
  return s
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/&/g, "&");
}

function attr(chunk: string, name: string): string | undefined {
  const m = chunk.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
  return m?.[1];
}

export function buildTitleIndexFromXml(xml: string): TitleIndex {
  const byNorm = new Map<string, AniDbTitleHit[]>();
  let entryCount = 0;

  const animeRe = /<anime\b([^>]*)>([\s\S]*?)<\/anime>/gi;
  let am: RegExpExecArray | null;
  while ((am = animeRe.exec(xml))) {
    const aidStr = attr(am[1], "aid");
    if (!aidStr) continue;
    const aid = parseInt(aidStr, 10);
    if (!aid) continue;
    const body = am[2];
    const titleRe = /<title\b([^>]*)>([^<]*)<\/title>/gi;
    let tm: RegExpExecArray | null;
    while ((tm = titleRe.exec(body))) {
      const text = decodeXml(tm[2]).trim();
      if (!text) continue;
      const type = attr(tm[1], "type") || "unknown";
      const lang = attr(tm[1], "xml:lang") || attr(tm[1], "lang");
      const hit: AniDbTitleHit = { aid, title: text, type, lang };
      const norm = normalize(text);
      if (!norm) continue;
      const list = byNorm.get(norm) || [];
      list.push(hit);
      byNorm.set(norm, list);
      entryCount += 1;
    }
  }

  return {
    byNorm,
    builtAt: new Date().toISOString(),
    entryCount,
  };
}

async function downloadDumpXml(): Promise<string | null> {
  return withProviderLimit("anidb-titles", async () => {
    try {
      const res = await fetch(DUMP_URL, {
        headers: {
          "User-Agent": "AnimeNexusLantern/1.0 (title index; cache 7d)",
          Accept: "application/gzip,application/xml,*/*",
        },
      });
      if (!res.ok) {
        console.warn("[anidb-titles] dump HTTP", res.status);
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      // gzip magic
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        return gunzipSync(buf).toString("utf8");
      }
      return buf.toString("utf8");
    } catch (e) {
      console.warn("[anidb-titles]", e instanceof Error ? e.message : e);
      return null;
    }
  });
}

/**
 * Load index: memory → process cache → download dump.
 * Soft-fail returns null (search falls back to AniList).
 */
export async function getAniDbTitleIndex(): Promise<TitleIndex | null> {
  if (memoryIndex && memoryIndex.entryCount > 0) return memoryIndex;

  const cached = cacheGet<TitleIndex>(INDEX_KEY);
  if (cached && cached.entryCount > 0) {
    memoryIndex = cached;
    return cached;
  }

  const xml = await downloadDumpXml();
  if (!xml) return null;
  const index = buildTitleIndexFromXml(xml);
  if (!index.entryCount) return null;
  memoryIndex = index;
  cacheSet(INDEX_KEY, index, DUMP_TTL_MS);
  return index;
}

export type AliasSearchResult = {
  aid: number;
  matchedTitle: string;
  matchType: string;
  lang?: string;
  score: number;
};

/**
 * Search local alias index. Does not call AniDB HTTP API.
 * Exact norm match preferred; then prefix / includes for short queries.
 */
export async function searchAniDbTitles(
  query: string,
  limit = 12,
): Promise<AliasSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const index = await getAniDbTitleIndex();
  if (!index) return [];

  const nq = normalize(q);
  if (!nq) return [];

  const scored = new Map<number, AliasSearchResult>();

  const exact = index.byNorm.get(nq);
  if (exact) {
    for (const h of exact) {
      scored.set(h.aid, {
        aid: h.aid,
        matchedTitle: h.title,
        matchType: h.type,
        lang: h.lang,
        score: 1,
      });
    }
  }

  if (scored.size < limit) {
    for (const [norm, hits] of index.byNorm) {
      if (scored.size >= limit * 3) break;
      let score = 0;
      if (norm.startsWith(nq)) score = 0.85;
      else if (norm.includes(nq)) score = 0.65;
      else continue;
      for (const h of hits) {
        const prev = scored.get(h.aid);
        if (!prev || score > prev.score) {
          scored.set(h.aid, {
            aid: h.aid,
            matchedTitle: h.title,
            matchType: h.type,
            lang: h.lang,
            score,
          });
        }
      }
    }
  }

  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function aniDbTitleIndexStats(): {
  ready: boolean;
  entryCount: number;
  builtAt?: string;
} {
  if (!memoryIndex) return { ready: false, entryCount: 0 };
  return {
    ready: true,
    entryCount: memoryIndex.entryCount,
    builtAt: memoryIndex.builtAt,
  };
}
