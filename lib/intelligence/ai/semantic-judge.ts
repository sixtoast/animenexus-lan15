/**
 * AI semantic final judgement over a V3-ranked shortlist.
 * Builds the AnimeNexus packet and returns structured recommendations.
 */

import { callChatCompletions } from "@/lib/ai-chat";
import { isAIConfigured, readAISettings } from "@/lib/ai-settings";
import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  readAiIntentOverlay,
  readIntentSession,
} from "@/lib/intent-session";
import {
  getExperienceIntent,
  buildExperienceFingerprintTarget,
} from "@/lib/viewing-intent";
import type { RankedRecommendationV3 } from "@/lib/intelligence/recommendation/ranker-v3";
import { parseJsonSafe } from "./json-extract";
import { SEMANTIC_JUDGE_SYSTEM } from "./semantic-judge-prompt";
import type { StructuredViewingIntent } from "./interpret-intent";

export type SemanticJudgeCandidate = {
  id: number;
  title: string;
  synopsis: string;
  genres: string[];
  tags: string[];
  semanticSummary?: string;
  fingerprint?: Record<string, number>;
  systemScore: number;
  intentFit?: number;
  tasteFit?: number;
  completionLikelihood?: number;
  sourceAgreement?: number;
  noveltyLevel?: string;
  explorationLevel?: string;
  fatiguePenalty?: number;
  dropRisk?: number;
  strongSignals: string[];
  frictionSignals: string[];
  recommendationSources?: string[];
};

export type SemanticJudgePacket = {
  user: {
    tasteSummary: string;
    noveltyTolerance?: number;
    fatigueSignals: string[];
  };
  session: {
    explicitIntent: string;
    naturalLanguageRequest: string;
    energy: string;
    attention: string;
    intensity: string;
    minutesAvailable: number | null;
    hardAvoids: string[];
    softAvoids: string[];
    preferredTraits: string[];
  };
  intentTarget: {
    fingerprintTarget: Record<string, number>;
    fingerprintWeights: Record<string, number>;
  };
  candidates: SemanticJudgeCandidate[];
};

export type SemanticJudgeRecommendation = {
  id: number;
  rank: number;
  confidence: "low" | "medium" | "high";
  why: string[];
  possibleFriction: string[];
  selectionType:
    | "best_match"
    | "safe_match"
    | "adjacent_match"
    | "exploration_pick"
    | "wildcard";
};

export type SemanticJudgeResult = {
  interpretation: {
    whatTheUserWants: string;
    mostImportantSignals: string[];
    importantAvoids: string[];
  };
  recommendations: SemanticJudgeRecommendation[];
  overallConfidence: "low" | "medium" | "high";
};

function listDigest(entries: WatchlistEntry[]): string {
  return entries
    .slice(0, 28)
    .map(
      (e) =>
        `${e.title} [${e.watchStatus}]` +
        (e.userRating ? ` \u2605${e.userRating}` : "") +
        (e.genres?.length ? ` \u00b7 ${e.genres.slice(0, 3).join("/")}` : ""),
    )
    .join("; ");
}

function flatFingerprint(
  fp: RankedRecommendationV3["featureBreakdown"] | undefined,
): Record<string, number> {
  if (!fp) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(fp)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = Number(v.toFixed(3));
  }
  return out;
}

export function buildSemanticJudgePacket(opts: {
  ranked: RankedRecommendationV3[];
  entries: WatchlistEntry[];
  experienceSlug?: string | null;
  limit?: number;
}): SemanticJudgePacket {
  const session = typeof window !== "undefined" ? readIntentSession() : null;
  const aiOverlay =
    typeof window !== "undefined" ? readAiIntentOverlay() : null;
  const structured: StructuredViewingIntent | null =
    aiOverlay?.structured || null;

  const slug =
    opts.experienceSlug ||
    session?.slug ||
    structured?.intent ||
    null;
  const exp = slug ? getExperienceIntent(slug) : undefined;
  const built = exp
    ? buildExperienceFingerprintTarget(exp, {
        intensity: session?.intensity,
        energy: session?.energy,
        attention: session?.attention,
        minutesAvailable: session?.minutesAvailable,
      })
    : null;

  const naturalLanguageRequest =
    aiOverlay?.freeText || structured?.paraphrase || "";

  const hardAvoids = structured?.hardAvoid || [];
  const softAvoids = structured?.avoid || [];
  const preferredTraits = [
    ...(structured?.mustHave || []),
    ...(structured?.prefer || []),
  ];

  const limit = opts.limit ?? 30;
  const candidates: SemanticJudgeCandidate[] = opts.ranked
    .slice(0, limit)
    .map((r) => ({
      id: r.anime.id,
      title: r.anime.title,
      synopsis: (r.anime.description || "").slice(0, 280),
      genres: [
        r.anime.genre,
        ...((r.anime as { genres?: string[] }).genres || []),
      ].filter(Boolean),
      tags: (r.anime.tags || []).slice(0, 10),
      systemScore: Number(r.score.toFixed(3)),
      intentFit: r.featureBreakdown?.viewingIntent,
      tasteFit: r.featureBreakdown?.stableTaste,
      completionLikelihood: r.featureBreakdown?.completionLikelihood,
      sourceAgreement: r.sourceAgreement,
      explorationLevel: r.explorationLevel,
      fatiguePenalty: r.featureBreakdown?.fatigue,
      dropRisk: r.featureBreakdown?.dropRisk,
      strongSignals: r.strongSignals.map((s) => s.label),
      frictionSignals: r.frictionSignals.map((f) => f.message || f.messageKey),
      fingerprint: flatFingerprint(r.featureBreakdown),
    }));

  return {
    user: {
      tasteSummary: listDigest(opts.entries),
      fatigueSignals: [],
    },
    session: {
      explicitIntent: exp?.slug || slug || "",
      naturalLanguageRequest,
      energy: session?.energy || "medium",
      attention: session?.attention || "medium",
      intensity: session?.intensity || "moderate",
      minutesAvailable: session?.minutesAvailable ?? null,
      hardAvoids,
      softAvoids,
      preferredTraits,
    },
    intentTarget: {
      fingerprintTarget: {
        ...(exp?.fingerprintTarget || {}),
        ...(built?.target || {}),
      },
      fingerprintWeights: {
        ...(exp?.fingerprintWeights || {}),
        ...(built?.weights || {}),
      },
    },
    candidates,
  };
}

function normalizeResult(
  raw: SemanticJudgeResult | null,
  allowedIds: Set<number>,
): SemanticJudgeResult | null {
  if (!raw || !Array.isArray(raw.recommendations)) return null;
  const seen = new Set<number>();
  const recs: SemanticJudgeRecommendation[] = [];
  for (const r of raw.recommendations) {
    if (!allowedIds.has(r.id) || seen.has(r.id)) continue;
    seen.add(r.id);
    const conf =
      r.confidence === "low" || r.confidence === "medium" || r.confidence === "high"
        ? r.confidence
        : "medium";
    const selectionType = (
      [
        "best_match",
        "safe_match",
        "adjacent_match",
        "exploration_pick",
        "wildcard",
      ] as const
    ).includes(r.selectionType as SemanticJudgeRecommendation["selectionType"])
      ? r.selectionType
      : "best_match";
    recs.push({
      id: r.id,
      rank: recs.length + 1,
      confidence: conf,
      why: Array.isArray(r.why)
        ? r.why.filter((x) => typeof x === "string").slice(0, 4)
        : [],
      possibleFriction: Array.isArray(r.possibleFriction)
        ? r.possibleFriction.filter((x) => typeof x === "string").slice(0, 3)
        : [],
      selectionType,
    });
  }
  if (!recs.length) return null;
  return {
    interpretation: {
      whatTheUserWants:
        raw.interpretation?.whatTheUserWants || "Tonight's viewing intent",
      mostImportantSignals: Array.isArray(raw.interpretation?.mostImportantSignals)
        ? raw.interpretation.mostImportantSignals.slice(0, 6)
        : [],
      importantAvoids: Array.isArray(raw.interpretation?.importantAvoids)
        ? raw.interpretation.importantAvoids.slice(0, 6)
        : [],
    },
    recommendations: recs.slice(0, 8),
    overallConfidence:
      raw.overallConfidence === "low" ||
      raw.overallConfidence === "medium" ||
      raw.overallConfidence === "high"
        ? raw.overallConfidence
        : "medium",
  };
}

export async function runSemanticJudge(
  packet: SemanticJudgePacket,
  opts?: { temperature?: number },
): Promise<SemanticJudgeResult | null> {
  if (!isAIConfigured()) return null;
  if (!packet.candidates.length) return null;

  const raw = await callChatCompletions(
    [
      { role: "system", content: SEMANTIC_JUDGE_SYSTEM },
      {
        role: "user",
        content: `AnimeNexus packet:\n${JSON.stringify(packet)}\n\nReturn STRICT JSON only for the best 5 candidates.`,
      },
    ],
    {
      temperature: opts?.temperature ?? 0.2,
      settings: readAISettings(),
    },
  );

  const allowed = new Set(packet.candidates.map((c) => c.id));
  return normalizeResult(
    parseJsonSafe<SemanticJudgeResult>(raw),
    allowed,
  );
}

/** Apply semantic judge order on top of V3 ranks. */
export function applySemanticJudgeOrder(
  ranked: RankedRecommendationV3[],
  judge: SemanticJudgeResult | null,
): RankedRecommendationV3[] {
  if (!judge?.recommendations?.length) return ranked;
  const byId = new Map(ranked.map((r) => [r.anime.id, r]));
  const ordered: RankedRecommendationV3[] = [];
  const seen = new Set<number>();
  for (const rec of judge.recommendations) {
    const item = byId.get(rec.id);
    if (!item || seen.has(rec.id)) continue;
    seen.add(rec.id);
    ordered.push({
      ...item,
      reasons: [...rec.why.slice(0, 3), ...item.reasons].slice(0, 6),
    });
  }
  for (const r of ranked) {
    if (!seen.has(r.anime.id)) ordered.push(r);
  }
  return ordered;
}

export async function rankWithSemanticJudge(
  ranked: RankedRecommendationV3[],
  entries: WatchlistEntry[],
  opts?: { experienceSlug?: string | null; limit?: number },
): Promise<{
  ranked: RankedRecommendationV3[];
  judge: SemanticJudgeResult | null;
}> {
  if (!isAIConfigured() || ranked.length < 3) {
    return { ranked, judge: null };
  }
  try {
    const packet = buildSemanticJudgePacket({
      ranked,
      entries,
      experienceSlug: opts?.experienceSlug,
      limit: opts?.limit ?? 24,
    });
    const judge = await runSemanticJudge(packet);
    return {
      ranked: applySemanticJudgeOrder(ranked, judge),
      judge,
    };
  } catch {
    return { ranked, judge: null };
  }
}
