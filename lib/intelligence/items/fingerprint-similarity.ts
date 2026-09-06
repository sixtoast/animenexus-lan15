import {
  EMOTIONAL_KEYS,
  EXPERIENCE_KEYS,
  NARRATIVE_KEYS,
  STYLE_KEYS,
  fingerprintToVector,
  type AnimePreferenceFingerprint,
  type FingerprintVector,
} from "./anime-preference-fingerprint";

export type FingerprintSimilarityWeights = {
  emotional: number;
  narrative: number;
  experience: number;
  structure: number;
  style: number;
};

export const WEIGHTS_TONIGHT: FingerprintSimilarityWeights = {
  emotional: 1.2,
  narrative: 0.7,
  experience: 1.3,
  structure: 0.9,
  style: 0.5,
};

export const WEIGHTS_LONG_TERM: FingerprintSimilarityWeights = {
  emotional: 1.1,
  narrative: 1.2,
  experience: 0.8,
  structure: 0.6,
  style: 1.0,
};

export const WEIGHTS_BLIND_SPOT: FingerprintSimilarityWeights = {
  emotional: 1.0,
  narrative: 1.1,
  experience: 0.9,
  structure: 0.5,
  style: 0.8,
};

function groupOf(key: string): keyof FingerprintSimilarityWeights {
  if (key.startsWith("emotional.")) return "emotional";
  if (key.startsWith("narrative.")) return "narrative";
  if (key.startsWith("experience.")) return "experience";
  if (key.startsWith("style.")) return "style";
  return "structure";
}

export function cosineWeighted(
  a: FingerprintVector,
  b: FingerprintVector,
  weights: FingerprintSimilarityWeights = WEIGHTS_LONG_TERM,
): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    const w = weights[groupOf(k)] ?? 1;
    const av = (a[k] ?? 0.5) - 0.5;
    const bv = (b[k] ?? 0.5) - 0.5;
    dot += av * bv * w;
    na += av * av * w;
    nb += bv * bv * w;
  }
  if (na < 1e-8 || nb < 1e-8) return 0;
  return Math.max(-1, Math.min(1, dot / (Math.sqrt(na) * Math.sqrt(nb))));
}

export function similarityScore(
  a: AnimePreferenceFingerprint,
  b: AnimePreferenceFingerprint,
  weights?: FingerprintSimilarityWeights,
): number {
  const c = cosineWeighted(
    fingerprintToVector(a),
    fingerprintToVector(b),
    weights,
  );
  return Math.max(0, Math.min(1, (c + 1) / 2));
}

export function vectorSimilarity(
  user: FingerprintVector,
  item: AnimePreferenceFingerprint,
  weights?: FingerprintSimilarityWeights,
): number {
  const c = cosineWeighted(user, fingerprintToVector(item), weights);
  return Math.max(0, Math.min(1, (c + 1) / 2));
}

export function topAlignedDimensions(
  user: FingerprintVector,
  item: AnimePreferenceFingerprint,
  limit = 4,
): { key: string; user: number; item: number; align: number }[] {
  const iv = fingerprintToVector(item);
  const rows: { key: string; user: number; item: number; align: number }[] =
    [];
  for (const k of Object.keys(iv)) {
    const u = user[k] ?? 0.5;
    const it = iv[k] ?? 0.5;
    rows.push({ key: k, user: u, item: it, align: 1 - Math.abs(u - it) });
  }
  rows.sort((a, b) => b.align - a.align);
  return rows.slice(0, limit);
}

export function humanizeDimKey(key: string): string {
  const leaf = key.includes(".") ? key.split(".")[1]! : key;
  return leaf
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export { EMOTIONAL_KEYS, NARRATIVE_KEYS, EXPERIENCE_KEYS, STYLE_KEYS };
