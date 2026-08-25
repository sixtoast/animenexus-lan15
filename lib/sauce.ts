/**
 * Scene search normalization (Multi-API Sprint 16).
 * Primary: trace.moe · Optional fallback: SauceNAO (SAUCENAO_API_KEY)
 */

import type { SceneMatch } from "./enrichment-types";

export type SauceConfidence = "high" | "medium" | "low" | "exploratory";

export type SauceHit = {
  anilistId: number | null;
  malId?: number | null;
  filename: string;
  episode: number | string | null;
  similarity: number;
  from: number;
  to: number;
  video?: string;
  image?: string;
  source: "trace.moe" | "saucenao";
  confidence: SauceConfidence;
  title?: string;
};

export type SauceResponse = {
  hits: SauceHit[];
  matches: SceneMatch[];
  providers: string[];
  error?: string;
};

type TraceResult = {
  anilist?: number | { id?: number; title?: { romaji?: string; english?: string } };
  filename?: string;
  episode?: number | string | null;
  similarity?: number;
  from?: number;
  to?: number;
  video?: string;
  image?: string;
};

export function similarityToConfidence(sim: number): SauceConfidence {
  if (sim >= 0.9) return "high";
  if (sim >= 0.8) return "medium";
  if (sim >= 0.7) return "low";
  return "exploratory";
}

export function mapTraceResults(raw: {
  result?: TraceResult[];
  error?: string;
}): SauceResponse {
  if (raw.error) {
    return { hits: [], matches: [], providers: ["trace.moe"], error: raw.error };
  }

  const hits: SauceHit[] = [];
  const matches: SceneMatch[] = [];

  for (const r of raw.result || []) {
    let anilistId: number | null = null;
    let title: string | undefined;
    if (typeof r.anilist === "number") anilistId = r.anilist;
    else if (r.anilist && typeof r.anilist === "object") {
      if (r.anilist.id) anilistId = r.anilist.id;
      title =
        r.anilist.title?.english || r.anilist.title?.romaji || undefined;
    }
    const sim = r.similarity ?? 0;
    const hit: SauceHit = {
      anilistId,
      filename: r.filename || "unknown",
      episode: r.episode ?? null,
      similarity: sim,
      from: r.from ?? 0,
      to: r.to ?? 0,
      video: r.video,
      image: r.image,
      source: "trace.moe",
      confidence: similarityToConfidence(sim),
      title,
    };
    hits.push(hit);
    matches.push({
      anilistId: hit.anilistId,
      episode: hit.episode,
      from: hit.from,
      to: hit.to,
      similarity: hit.similarity,
      filename: hit.filename,
      image: hit.image,
      video: hit.video,
      source: "trace.moe",
    });
  }

  return { hits, matches, providers: ["trace.moe"] };
}

/** Merge and dedupe by anilistId preferring higher similarity. */
export function mergeSauceHits(...lists: SauceHit[][]): SauceHit[] {
  const map = new Map<string, SauceHit>();
  for (const list of lists) {
    for (const h of list) {
      const key =
        h.anilistId != null
          ? `al:${h.anilistId}`
          : `f:${h.filename}:${h.from}`;
      const prev = map.get(key);
      if (!prev || h.similarity > prev.similarity) map.set(key, h);
    }
  }
  return [...map.values()].sort((a, b) => b.similarity - a.similarity);
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
