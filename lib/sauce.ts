/** trace.moe result normalization */

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
  if (raw.error) return { hits: [], error: raw.error };
  const hits: SauceHit[] = (raw.result || []).map((r) => {
    let anilistId: number | null = null;
    if (typeof r.anilist === "number") anilistId = r.anilist;
    else if (r.anilist && typeof r.anilist === "object" && r.anilist.id) {
      anilistId = r.anilist.id;
    }
    return {
      anilistId,
      filename: r.filename || "unknown",
      episode: r.episode ?? null,
      similarity: r.similarity ?? 0,
      from: r.from ?? 0,
      to: r.to ?? 0,
      video: r.video,
      image: r.image,
    };
  });
  return { hits };
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
