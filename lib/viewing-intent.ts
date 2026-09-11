/**
 * Viewing Intent (V3). Explicit mood → authored fingerprint target.
 * genreHints = retrieval only. V3 fingerprintIntentFit is canonical.
 */
import type { AnimePreferenceFingerprint } from "@/lib/intelligence/items/anime-preference-fingerprint";
import { fingerprintToVector } from "@/lib/intelligence/items/anime-preference-fingerprint";
import type { IntentSession } from "@/lib/intent-session";
import type {
  ExperienceIntent,
  IntentDim,
  IntentFingerprintTarget,
  IntentFingerprintWeights,
  IntentVector,
  SessionIntentControls,
} from "./viewing-intent-types";
import { INTENT_DIMS } from "./viewing-intent-types";
import { EXPERIENCE_INTENTS } from "./viewing-intent-defs";
import { buildSessionAdjustedIntent } from "./session-intent-adjust";
export { buildSessionAdjustedIntent } from "./session-intent-adjust";

export type {
  ExperienceIntent,
  IntentDim,
  IntentFingerprintTarget,
  IntentFingerprintWeights,
  IntentVector,
  SessionIntentControls,
} from "./viewing-intent-types";
export { INTENT_DIMS } from "./viewing-intent-types";
export { EXPERIENCE_INTENTS } from "./viewing-intent-defs";

export function emptyIntent(): IntentVector {
  const v = {} as IntentVector;
  for (const d of INTENT_DIMS) v[d] = 0.5;
  return v;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

export function getExperienceIntent(slug: string): ExperienceIntent | undefined {
  return EXPERIENCE_INTENTS.find((e) => e.slug === slug);
}

export const LEGACY_MOOD_MAP: Record<string, string> = {
  chill: "gentle", hype: "tense", cry: "destroy", laugh: "laugh", romance: "romance",
  spooky: "tense", fantasy: "wonder", mind: "think", scifi: "wonder", masterpiece: "surprise",
};

export function resolveIntentSlug(slug: string): string {
  if (getExperienceIntent(slug)) return slug;
  return LEGACY_MOOD_MAP[slug] || slug;
}

export function buildExperienceFingerprintTarget(
  exp: ExperienceIntent,
  session?: SessionIntentControls | IntentSession | null,
): { target: IntentFingerprintTarget; weights: IntentFingerprintWeights } {
  const adjusted = buildSessionAdjustedIntent(exp, session);
  return { target: adjusted.target, weights: adjusted.weights };
}

export function fingerprintIntentFit(
  fp: AnimePreferenceFingerprint,
  exp: ExperienceIntent,
  session?: SessionIntentControls | IntentSession | null,
): number {
  if (exp.slug === "surprise") return 0.5;
  const { target, weights } = buildExperienceFingerprintTarget(exp, session);
  const keys = Object.keys(target);
  if (!keys.length) return 0.5;
  const vector = fingerprintToVector(fp);
  let score = 0, weightTotal = 0;
  for (const key of keys) {
    const desired = target[key] as number;
    const actual = vector[key] ?? 0.5;
    const confidence = fp.confidence.dimensions[key] ?? fp.confidence.overall ?? 0.5;
    const importance = weights[key] ?? 1;
    const fit = 1 - Math.abs(actual - desired);
    score += clamp01(0.5 + (fit - 0.5) * (0.45 + confidence * 0.55)) * importance;
    weightTotal += importance;
  }
  return weightTotal < 1e-9 ? 0.5 : clamp01(score / weightTotal);
}

export function animeIntentFingerprint(tags: string[] | undefined): IntentVector {
  const v = emptyIntent();
  const t = (tags || []).map((x) => x.toLowerCase());
  const has = (s: string) => t.some((x) => x.includes(s));
  if (has("comedy")) { v.humour = 0.9; v.valence = 0.8; v.arousal = 0.7; }
  if (has("drama")) { v.intensity = 0.7; v.melancholy = 0.65; v.reflection = 0.7; }
  if (has("slice of life")) { v.comfort = 0.85; v.pacing = 0.3; v.arousal = 0.3; }
  if (has("action") || has("adventure")) { v.arousal = 0.85; v.pacing = 0.8; v.intensity = 0.75; }
  if (has("horror") || has("thriller")) { v.tension = 0.9; v.darkness = 0.8; v.comfort = 0.15; }
  if (has("romance")) v.romance = 0.9;
  if (has("psychological") || has("mystery")) { v.cognitiveLoad = 0.85; v.tension = 0.7; v.reflection = 0.75; }
  if (has("fantasy") || has("sci-fi") || has("scifi")) v.wonder = 0.85;
  if (has("sports")) { v.arousal = 0.8; v.hope = 0.75; }
  return v;
}

export function intentSimilarity(a: IntentVector, b: IntentVector): number {
  let dot = 0, na = 0, nb = 0;
  for (const d of INTENT_DIMS) {
    const x = (a[d] ?? 0.5) - 0.5, y = (b[d] ?? 0.5) - 0.5;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (na < 1e-9 || nb < 1e-9) return 0.5;
  return clamp01((dot / (Math.sqrt(na) * Math.sqrt(nb)) + 1) / 2);
}

export function experienceIntentSimilarity(exp: ExperienceIntent, animeVector: IntentVector): number {
  const keys = Object.keys(exp.target) as IntentDim[];
  if (!keys.length) return 0.5;
  let score = 0, weightTotal = 0;
  for (const d of keys) {
    const desired = exp.target[d] as number, actual = animeVector[d] ?? 0.5;
    const importance = Math.abs(desired - 0.5) * 1.5 + 0.5;
    score += (1 - Math.abs(actual - desired)) * importance;
    weightTotal += importance;
  }
  return weightTotal < 1e-9 ? 0.5 : clamp01(score / weightTotal);
}

export function blendIntent(base: IntentVector, overlay: Partial<IntentVector>, weight = 0.55): IntentVector {
  const out = { ...base };
  for (const d of INTENT_DIMS) {
    if (overlay[d] != null) out[d] = base[d] * (1 - weight) + (overlay[d] as number) * weight;
  }
  return out;
}
