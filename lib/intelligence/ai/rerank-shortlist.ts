/**
 * AI reranker on a small shortlist only — never invents titles.
 * Blend ~25% into final order; deterministic scores stay primary.
 */

import { callChatCompletions } from "@/lib/ai-chat";
import { isAIConfigured, readAISettings } from "@/lib/ai-settings";
import type { Anime } from "@/lib/types";
import type { StructuredViewingIntent } from "./interpret-intent";
import { parseJsonSafe } from "./json-extract";

export type RerankItem = {
  id: number;
  scoreAdjustment: number;
  reasonCodes: string[];
};

export type RerankResult = {
  ranked: RerankItem[];
  blendWeight: number;
};

export const CONTROLLED_REASON_CODES = [
  "character_attachment",
  "slow_emotional_payoff",
  "high_tension",
  "low_cognitive_load",
  "similar_pacing",
  "different_genre_same_feel",
  "strong_worldbuilding",
  "high_catharsis",
  "low_commitment",
  "experimental_pick",
  "matches_low_energy",
  "high_emotional_payoff",
  "restrained_melancholy",
  "comfort_without_boredom",
] as const;

const SYSTEM = `You are Lantern's shortlist reranker for AnimeNexus.
You may ONLY reorder the provided candidate IDs. Never invent new IDs or titles.
Return STRICT JSON:
{
  "ranked": [
    { "id": number, "scoreAdjustment": number, "reasonCodes": string[] }
  ]
}
scoreAdjustment is roughly -0.2 .. +0.2 relative nudge.
reasonCodes must be chosen from: ${CONTROLLED_REASON_CODES.join(", ")}.
Include every candidate id exactly once, best-first for the stated intent.`;

export async function rerankShortlist(opts: {
  candidates: Array<{ anime: Anime; detScore: number }>;
  intent: StructuredViewingIntent | { paraphrase?: string; intent?: string };
  tasteDigest?: string;
  blendWeight?: number;
}): Promise<RerankResult> {
  const blendWeight = opts.blendWeight ?? 0.25;
  const list = opts.candidates.slice(0, 40);
  if (list.length === 0) return { ranked: [], blendWeight };

  if (!isAIConfigured()) {
    return {
      ranked: list.map((c) => ({
        id: c.anime.id,
        scoreAdjustment: 0,
        reasonCodes: [],
      })),
      blendWeight: 0,
    };
  }

  const packet = {
    intent: opts.intent,
    candidates: list.map((c) => ({
      id: c.anime.id,
      title: c.anime.title,
      score: c.anime.score,
      format: c.anime.format,
      episodes: c.anime.episodes,
      tags: (c.anime.tags || []).slice(0, 8),
      detScore: Number(c.detScore.toFixed(3)),
      synopsis: (c.anime.description || "").slice(0, 220),
    })),
    tasteDigest: (opts.tasteDigest || "").slice(0, 600),
  };

  const raw = await callChatCompletions(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Shortlist packet:\n${JSON.stringify(packet)}\n\nJSON only.`,
      },
    ],
    { temperature: 0.1, settings: readAISettings() },
  );

  const parsed = parseJsonSafe<{ ranked?: RerankItem[] }>(raw);
  const allowed = new Set(list.map((c) => c.anime.id));
  const seen = new Set<number>();
  const ranked: RerankItem[] = [];
  for (const r of parsed?.ranked || []) {
    if (!allowed.has(r.id) || seen.has(r.id)) continue;
    seen.add(r.id);
    ranked.push({
      id: r.id,
      scoreAdjustment: Math.max(
        -0.25,
        Math.min(0.25, Number(r.scoreAdjustment) || 0),
      ),
      reasonCodes: (r.reasonCodes || [])
        .filter((c) =>
          (CONTROLLED_REASON_CODES as readonly string[]).includes(c),
        )
        .slice(0, 4),
    });
  }
  for (const c of list) {
    if (!seen.has(c.anime.id)) {
      ranked.push({ id: c.anime.id, scoreAdjustment: 0, reasonCodes: [] });
    }
  }

  return { ranked, blendWeight };
}

/** Apply blend: final = (1-w)*det + w*aiOrderScore */
export function blendRerankScores(
  detScores: Map<number, number>,
  rerank: RerankResult,
): Map<number, number> {
  const n = Math.max(1, rerank.ranked.length);
  const out = new Map<number, number>();
  const w = rerank.blendWeight;
  rerank.ranked.forEach((r, i) => {
    const orderScore = 1 - i / n;
    const det = detScores.get(r.id) ?? 0.5;
    const adj = r.scoreAdjustment;
    out.set(r.id, Math.max(0, Math.min(1, (1 - w) * det + w * orderScore + adj * w)));
  });
  return out;
}
