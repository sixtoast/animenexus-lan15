/**
 * SauceNAO optional fallback (Multi-API Sprint 16).
 * Requires SAUCENAO_API_KEY — soft-fail when missing.
 */

import {
  similarityToConfidence,
  type SauceHit,
} from "../sauce";
import { withProviderLimit } from "../provider-rate-limit";

const BASE = "https://saucenao.com/search.php";

export function isSauceNaoConfigured(): boolean {
  return Boolean(process.env.SAUCENAO_API_KEY?.trim());
}

type SnResult = {
  header?: {
    similarity?: string;
    thumbnail?: string;
    index_name?: string;
  };
  data?: {
    anilist_id?: number;
    mal_id?: number;
    source?: string;
    part?: string;
    year?: string;
    est_time?: string;
  };
};

export async function searchSauceNaoByUrl(imageUrl: string): Promise<SauceHit[]> {
  const key = process.env.SAUCENAO_API_KEY?.trim();
  if (!key) return [];

  return withProviderLimit("saucenao", async () => {
    try {
      const params = new URLSearchParams({
        api_key: key,
        output_type: "2",
        url: imageUrl,
        numres: "6",
        db: "999", // all
      });
      const res = await fetch(`${BASE}?${params}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { results?: SnResult[] };
      const hits: SauceHit[] = [];
      for (const r of json.results || []) {
        const sim = parseFloat(r.header?.similarity || "0") / 100;
        if (Number.isNaN(sim) || sim < 0.5) continue;
        hits.push({
          anilistId: r.data?.anilist_id ?? null,
          malId: r.data?.mal_id ?? null,
          filename: r.header?.index_name || r.data?.source || "SauceNAO",
          episode: r.data?.part ?? null,
          similarity: sim,
          from: 0,
          to: 0,
          image: r.header?.thumbnail,
          source: "saucenao",
          confidence: similarityToConfidence(sim),
          title: r.data?.source,
        });
      }
      return hits;
    } catch (e) {
      console.warn("[saucenao]", e instanceof Error ? e.message : e);
      return [];
    }
  });
}
