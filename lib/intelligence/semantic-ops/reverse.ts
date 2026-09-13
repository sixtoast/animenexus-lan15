/**
 * Reverse / Dislike — selective avoid + preserve (NOT full fingerprint inversion).
 */
import type { AnimePreferenceFingerprint } from "@/lib/intelligence/items/anime-preference-fingerprint";
import {
  ALL_DIM_KEYS,
  clamp01,
  dimConfidence,
  dimValue,
  type DimKey,
} from "./dims";

export type DislikeReasonId =
  | "too_slow"
  | "too_fast"
  | "too_dark"
  | "too_light"
  | "too_heavy"
  | "too_much_action"
  | "not_enough_action"
  | "too_complicated"
  | "too_simple"
  | "too_much_romance"
  | "not_enough_romance"
  | "too_comedic"
  | "too_serious"
  | "too_episodic"
  | "too_serialised"
  | "too_much_dialogue"
  | "too_much_commitment"
  | "weak_characters"
  | "weak_relationships"
  | "weak_world"
  | "too_tense"
  | "too_chaotic";

export type ReasonMapping = {
  id: DislikeReasonId;
  label: string;
  dimensions: DimKey[];
  direction: "decrease" | "increase";
  targetPull: number;
};

export const DISLIKE_REASON_MAP: ReasonMapping[] = [
  { id: "too_slow", label: "Too slow", dimensions: ["experience.pacing"], direction: "increase", targetPull: 0.72 },
  { id: "too_fast", label: "Too fast", dimensions: ["experience.pacing"], direction: "decrease", targetPull: 0.28 },
  { id: "too_dark", label: "Too dark", dimensions: ["emotional.darkness"], direction: "decrease", targetPull: 0.28 },
  { id: "too_light", label: "Too light / shallow", dimensions: ["emotional.darkness", "emotional.melancholy"], direction: "increase", targetPull: 0.65 },
  { id: "too_heavy", label: "Too emotionally heavy", dimensions: ["emotional.melancholy", "experience.emotionalIntensity"], direction: "decrease", targetPull: 0.3 },
  { id: "too_much_action", label: "Too much action", dimensions: ["experience.actionIntensity"], direction: "decrease", targetPull: 0.3 },
  { id: "not_enough_action", label: "Not enough action", dimensions: ["experience.actionIntensity"], direction: "increase", targetPull: 0.7 },
  { id: "too_complicated", label: "Too complicated", dimensions: ["experience.cognitiveLoad", "narrative.narrativeComplexity"], direction: "decrease", targetPull: 0.32 },
  { id: "too_simple", label: "Too simple", dimensions: ["experience.cognitiveLoad", "narrative.narrativeComplexity"], direction: "increase", targetPull: 0.7 },
  { id: "too_much_romance", label: "Too much romance", dimensions: ["emotional.romance", "narrative.relationshipFocus"], direction: "decrease", targetPull: 0.25 },
  { id: "not_enough_romance", label: "Not enough romance", dimensions: ["emotional.romance"], direction: "increase", targetPull: 0.72 },
  { id: "too_comedic", label: "Too comedic", dimensions: ["emotional.humour"], direction: "decrease", targetPull: 0.28 },
  { id: "too_serious", label: "Too serious", dimensions: ["emotional.humour"], direction: "increase", targetPull: 0.65 },
  { id: "too_episodic", label: "Too episodic", dimensions: ["experience.episodicVsSerialised"], direction: "increase", targetPull: 0.7 },
  { id: "too_serialised", label: "Too serialised", dimensions: ["experience.episodicVsSerialised"], direction: "decrease", targetPull: 0.3 },
  { id: "too_much_dialogue", label: "Too much dialogue", dimensions: ["style.dialogueDensity"], direction: "decrease", targetPull: 0.32 },
  { id: "too_much_commitment", label: "Too long / commitment", dimensions: ["experience.commitment"], direction: "decrease", targetPull: 0.3 },
  { id: "weak_characters", label: "Didn't connect with characters", dimensions: ["narrative.characterFocus"], direction: "increase", targetPull: 0.78 },
  { id: "weak_relationships", label: "Didn't care about relationships", dimensions: ["narrative.relationshipFocus"], direction: "increase", targetPull: 0.75 },
  { id: "weak_world", label: "World wasn't interesting", dimensions: ["narrative.worldBuilding"], direction: "increase", targetPull: 0.78 },
  { id: "too_tense", label: "Too tense", dimensions: ["emotional.tension"], direction: "decrease", targetPull: 0.28 },
  { id: "too_chaotic", label: "Too chaotic", dimensions: ["style.tonalVolatility"], direction: "decrease", targetPull: 0.3 },
];

export type DislikeProfile = {
  sourceAnimeId: number;
  avoidDimensions: Partial<Record<DimKey, number>>;
  preserveDimensions: Partial<Record<DimKey, number>>;
  reasons: DislikeReasonId[];
  reasonSource: "explicit" | "inferred";
  confidence: number;
};

export function buildDislikeProfile(
  source: AnimePreferenceFingerprint,
  reasonIds: DislikeReasonId[],
  userVec?: Record<string, number> | null,
): DislikeProfile {
  const avoid: Partial<Record<DimKey, number>> = {};
  const preserve: Partial<Record<DimKey, number>> = {};
  const explicit = reasonIds.length > 0;

  for (const id of reasonIds) {
    const m = DISLIKE_REASON_MAP.find((x) => x.id === id);
    if (!m) continue;
    for (const dim of m.dimensions) {
      avoid[dim] = m.targetPull;
    }
  }

  for (const key of ALL_DIM_KEYS) {
    if (avoid[key] != null) continue;
    const src = dimValue(source, key);
    const conf = dimConfidence(source, key);
    if (conf < 0.3) continue;
    // 1) Strong established user preference → full preserve authority
    if (userVec && typeof userVec[key] === "number" && userVec[key]! >= 0.62) {
      preserve[key] = src;
      continue;
    }
    // 2) Source-trait strength alone is only a weak hint (NOT full preserve)
    if (src >= 0.8 && conf >= 0.35) {
      preserve[key] = Math.min(src, 0.45);
    }
  }

  if (!explicit && userVec) {
    for (const key of ALL_DIM_KEYS) {
      const src = dimValue(source, key);
      const u = userVec[key];
      if (typeof u !== "number") continue;
      if (src - u >= 0.28 && src >= 0.65) {
        avoid[key] = clamp01(u);
      }
    }
  }

  return {
    sourceAnimeId: source.animeId,
    avoidDimensions: avoid,
    preserveDimensions: preserve,
    reasons: reasonIds,
    reasonSource: explicit ? "explicit" : "inferred",
    confidence: explicit ? 0.85 : userVec ? 0.45 : 0.25,
  };
}

export function scoreReverseCandidate(
  candidate: AnimePreferenceFingerprint,
  profile: DislikeProfile,
  userFit: number,
  quality01: number,
): {
  avoidanceSatisfaction: number;
  preservationSatisfaction: number;
  finalScore: number;
} {
  const avoidKeys = Object.keys(profile.avoidDimensions) as DimKey[];
  const preserveKeys = Object.keys(profile.preserveDimensions) as DimKey[];

  let avoidScore = 0.5;
  if (avoidKeys.length) {
    let s = 0;
    for (const k of avoidKeys) {
      const target = profile.avoidDimensions[k]!;
      const v = dimValue(candidate, k);
      s += 1 - Math.min(1, Math.abs(v - target) / 0.5);
    }
    avoidScore = clamp01(s / avoidKeys.length);
  }

  let preserveScore = 0.5;
  if (preserveKeys.length) {
    let s = 0;
    for (const k of preserveKeys) {
      const target = profile.preserveDimensions[k]!;
      const v = dimValue(candidate, k);
      s += 1 - Math.min(1, Math.abs(v - target) / 0.45);
    }
    preserveScore = clamp01(s / preserveKeys.length);
  }

  const finalScore = clamp01(
    avoidScore * 0.38 +
      preserveScore * 0.32 +
      userFit * 0.18 +
      quality01 * 0.12,
  );

  return {
    avoidanceSatisfaction: avoidScore,
    preservationSatisfaction: preserveScore,
    finalScore,
  };
}
