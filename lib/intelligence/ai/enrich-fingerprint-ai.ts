/**
 * AI-enriched anime fingerprints — representation only, not recommendations.
 * Cached in localStorage per animeId + version.
 */

import { callChatCompletions } from "@/lib/ai-chat";
import { isAIConfigured, readAISettings } from "@/lib/ai-settings";
import type { Anime } from "@/lib/types";
import {
  EMOTIONAL_KEYS,
  EXPERIENCE_KEYS,
  NARRATIVE_KEYS,
  STYLE_KEYS,
  type AnimePreferenceFingerprint,
  type EmotionalDims,
  type ExperienceDims,
  type NarrativeDims,
  type StyleDims,
} from "@/lib/intelligence/items/anime-preference-fingerprint";
import {
  buildEnrichedFingerprint,
  collectFingerprintLabels,
} from "@/lib/intelligence/items/fingerprint-enrichment";
import {
  setCachedFingerprint,
  getCachedFingerprint,
} from "@/lib/intelligence/items/fingerprint-cache";
import { parseJsonSafe } from "./json-extract";

const STORE_KEY = "anime_nexus_ai_fingerprints_v1";

type AiFpPayload = {
  emotional?: Partial<EmotionalDims>;
  narrative?: Partial<NarrativeDims>;
  experience?: Partial<ExperienceDims>;
  style?: Partial<StyleDims>;
  semanticDescriptor?: string;
  confidence?: number;
};

function loadStore(): Record<string, AiFpPayload & { at: number }> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Record<
      string,
      AiFpPayload & { at: number }
    >;
  } catch {
    return {};
  }
}

function saveStore(s: Record<string, AiFpPayload & { at: number }>) {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(s);
    if (keys.length > 400) {
      const sorted = keys.sort((a, b) => (s[a].at || 0) - (s[b].at || 0));
      for (const k of sorted.slice(0, keys.length - 350)) delete s[k];
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

function clamp01(n: unknown): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(1, n));
}

function mergeDims<T extends Record<string, number>>(
  base: T,
  patch: Partial<T> | undefined,
  keys: readonly (keyof T)[],
  aiWeight = 0.55,
): T {
  if (!patch) return base;
  const out = { ...base };
  for (const k of keys) {
    const v = clamp01(patch[k] as unknown);
    if (v == null) continue;
    const b = base[k] as number;
    (out as Record<string, number>)[k as string] =
      b * (1 - aiWeight) + v * aiWeight;
  }
  return out;
}

const SYSTEM = `You describe anime as experiential fingerprints for a recommender.
Return STRICT JSON only. Do NOT recommend other titles. Do NOT invent episode plots beyond the synopsis.

Schema:
{
  "emotional": { "comfort","melancholy","hope","darkness","tension","catharsis","wonder","humour","romance" },
  "narrative": { "mysteryDensity","narrativeComplexity","plotDensity","characterFocus","worldBuilding","moralAmbiguity","twistDensity","slowPayoff","relationshipFocus" },
  "experience": { "pacing","cognitiveLoad","actionIntensity","emotionalIntensity","accessibility","commitment" },
  "style": { "visualExperimentation","tonalVolatility","atmosphere","dialogueDensity" },
  "semanticDescriptor": string,
  "confidence": number
}
All dimension values are floats 0..1. Omit dimensions you cannot judge.`;

export function getStoredAiFingerprint(animeId: number): AiFpPayload | null {
  const s = loadStore();
  return s[String(animeId)] || null;
}

export async function enrichFingerprintWithAI(
  anime: Anime,
  base?: AnimePreferenceFingerprint,
): Promise<AnimePreferenceFingerprint> {
  const existing =
    base || getCachedFingerprint(anime.id) || buildEnrichedFingerprint(anime);
  const stored = getStoredAiFingerprint(anime.id);
  if (stored && stored.emotional) {
    return applyAiPatch(existing, stored);
  }

  if (!isAIConfigured()) return existing;

  const labels = collectFingerprintLabels(anime);
  const packet = {
    id: anime.id,
    title: anime.title,
    format: anime.format,
    episodes: anime.episodes,
    score: anime.score,
    genres: labels.anilistLabels.slice(0, 16),
    synopsis: (anime.synopsis || "").slice(0, 900),
  };

  const raw = await callChatCompletions(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Metadata packet:\n${JSON.stringify(packet)}\n\nReturn JSON fingerprint only.`,
      },
    ],
    { temperature: 0.15, settings: readAISettings() },
  );

  const parsed = parseJsonSafe<AiFpPayload>(raw);
  if (!parsed) return existing;

  const store = loadStore();
  store[String(anime.id)] = { ...parsed, at: Date.now() };
  saveStore(store);

  const merged = applyAiPatch(existing, parsed);
  setCachedFingerprint(merged);
  return merged;
}

function applyAiPatch(
  base: AnimePreferenceFingerprint,
  patch: AiFpPayload,
): AnimePreferenceFingerprint {
  const confBoost =
    typeof patch.confidence === "number"
      ? Math.max(0, Math.min(0.25, patch.confidence * 0.2))
      : 0.08;
  return {
    ...base,
    emotional: mergeDims(base.emotional, patch.emotional, EMOTIONAL_KEYS, 0.55),
    narrative: mergeDims(base.narrative, patch.narrative, NARRATIVE_KEYS, 0.55),
    experience: mergeDims(
      base.experience,
      patch.experience,
      EXPERIENCE_KEYS,
      0.5,
    ),
    style: mergeDims(base.style, patch.style, STYLE_KEYS, 0.5),
    confidence: {
      overall: Math.min(1, (base.confidence?.overall ?? 0.5) + confBoost),
      dimensions: { ...(base.confidence?.dimensions || {}) },
    },
    provenance: {
      sources: [
        ...new Set([
          ...(base.provenance?.sources || []),
          "synopsis-heuristic" as const,
        ]),
      ],
      generatedAt: Date.now(),
    },
  };
}

/** Batch helper — enriches missing only; respects concurrency. */
export async function enrichFingerprintsBatch(
  animeList: Anime[],
  opts?: { limit?: number; concurrency?: number },
): Promise<Map<number, AnimePreferenceFingerprint>> {
  const limit = opts?.limit ?? 12;
  const concurrency = opts?.concurrency ?? 2;
  const targets = animeList.slice(0, limit);
  const out = new Map<number, AnimePreferenceFingerprint>();
  let i = 0;
  async function worker() {
    while (i < targets.length) {
      const idx = i++;
      const a = targets[idx];
      try {
        out.set(a.id, await enrichFingerprintWithAI(a));
      } catch {
        out.set(a.id, buildEnrichedFingerprint(a));
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, () =>
      worker(),
    ),
  );
  return out;
}
