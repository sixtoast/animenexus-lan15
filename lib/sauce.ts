/** trace.moe result normalization (Sprint 3 provenance) */

import type { SceneMatch } from "./enrichment-types";

export type SauceHit = {
  anilistId: number | null;
  filename: string;
  episode: number | string | null;
  similarity: number;
  from: number;
  to: number;
  video?: string;
  image?: string;
};

export type SauceResponse = {
  hits: SauceHit[];
  /** Normalised for services */
  matches: SceneMatch[];
  error?: string;
};

type TraceResult = {
  anilist?: number | { id?: number };
  filename?: string;
  episode?: number | string | null;
  similarity?: number;
  from?: number;
  to?: number;
  video?: string;
  image?: string;
};

export function mapTraceResults(raw: {
  result?: TraceResult[];
  error?: string;
}): SauceResponse {
  if (raw.error) return { hits: [], matches: [], error: raw.error };

  const hits: SauceHit[] = [];
  const matches: SceneMatch[] = [];

  for (const r of raw.result || []) {
    let anilistId: number | null = null;
    if (typeof r.anilist === "number") anilistId = r.anilist;
    else if (r.anilist && typeof r.anilist === "object" && r.anilist.id) {
      anilistId = r.anilist.id;
    }
    const hit: SauceHit = {
      anilistId,
      filename: r.filename || "unknown",
      episode: r.episode ?? null,
      similarity: r.similarity ?? 0,
      from: r.from ?? 0,
      to: r.to ?? 0,
      video: r.video,
      image: r.image,
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

  return { hits, matches };
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
