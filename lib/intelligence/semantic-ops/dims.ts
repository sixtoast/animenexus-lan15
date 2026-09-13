/**
 * Flatten / unflatten AnimePreferenceFingerprint dimension keys.
 * Keys use dotted form: emotional.darkness, experience.pacing, …
 */
import type {
  AnimePreferenceFingerprint,
  FingerprintVector,
} from "@/lib/intelligence/items/anime-preference-fingerprint";
import {
  EMOTIONAL_KEYS,
  NARRATIVE_KEYS,
  EXPERIENCE_KEYS,
  STYLE_KEYS,
  fingerprintToVector,
} from "@/lib/intelligence/items/anime-preference-fingerprint";

export type DimKey = string;

export const ALL_DIM_KEYS: DimKey[] = [
  ...EMOTIONAL_KEYS.map((k) => `emotional.${k}`),
  ...NARRATIVE_KEYS.map((k) => `narrative.${k}`),
  ...EXPERIENCE_KEYS.map((k) => `experience.${k}`),
  ...STYLE_KEYS.map((k) => `style.${k}`),
];

/** Default semantic weights (canonical — not genre bonuses). */
export const DEFAULT_DIM_WEIGHTS: Record<string, number> = Object.fromEntries(
  ALL_DIM_KEYS.map((k) => {
    if (k.startsWith("emotional.")) return [k, 1.15];
    if (k.startsWith("narrative.")) return [k, 1.1];
    if (k.startsWith("experience.")) return [k, 1.2];
    return [k, 0.95];
  }),
);

export function dimValue(
  fp: AnimePreferenceFingerprint,
  key: DimKey,
): number {
  const v = fingerprintToVector(fp);
  const n = v[key];
  return typeof n === "number" && Number.isFinite(n) ? n : 0.5;
}

export function dimConfidence(
  fp: AnimePreferenceFingerprint,
  key: DimKey,
): number {
  const d = fp.confidence?.dimensions?.[key];
  if (typeof d === "number" && Number.isFinite(d)) return d;
  const o = fp.confidence?.overall;
  return typeof o === "number" && Number.isFinite(o) ? o : 0.4;
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function vectorFromFingerprint(
  fp: AnimePreferenceFingerprint,
): FingerprintVector {
  return fingerprintToVector(fp);
}
