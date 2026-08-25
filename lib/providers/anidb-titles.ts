/**
 * AniDB title intelligence (API Expansion II Sprint 5).
 *
 * Uses the public anime-titles dump (not per-keystroke HTTP API):
 *   https://anidb.net/api/anime-titles.xml.gz
 *
 * Refresh: process-local cache, TTL 7 days (dump updates infrequently).
 * Never download on every search keystroke — search the in-memory index only.
 */

import { gunzipSync } from "zlib";
import { CACHE_TTL, cacheGet, cacheKey, cacheSet } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";

const DUMP_URL = "https://anidb.net/api/anime-titles.xml.gz";
/** 7 days — dump is not real-time */
const DUMP_TTL_MS = 7 * 86_400_000;
const INDEX_KEY = cacheKey(["anidb", "titles-index", "v1"]);

export type AniDbTitleHit = {
  aid: number;
  title: string;
  type: string;
  lang?: string;
};

type TitleIndex = {
  /** normalized title → list of hits */
  byNorm: Map<string, AniDbTitleHit[]>;
  builtAt: string;
  entryCount: number;
};

// Module-level so warm serverless instances reuse the index
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

/** Parse anime-titles XML (uncompressed) into index. */
export function buildTitleIndexFromXml(xml: string): TitleIndex {
  const byNorm = new Map<string, AniDbTitleHit[]>();
  let entryCount = 0;

  // <anime aid="123"> ... <title type="…