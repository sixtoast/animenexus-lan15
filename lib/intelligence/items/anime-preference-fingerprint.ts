/**
 * Canonical AnimePreferenceFingerprint (Rec Intelligence V3).
 * Describes the anime — not the user. Dimensions normalised 0..1.
 */

export const FINGERPRINT_VERSION = "fingerprint_v1";

export type FingerprintSource =
  | "anilist-tags"
  | "anilist-genres"
  | "structure"
  | "synopsis-heuristic"
  | "deep-tags"
  | "resonance-prior"
  | "genre-fallback";

export type EmotionalDims = {
  comfort: number;
  melancholy: number;
  hope: number;
  darkness: number;
  tension: number;
  catharsis: number;
  wonder: number;
  humour: number;
  romance: number;
};

export type NarrativeDims = {
  mysteryDensity: number;
  narrativeComplexity: number;
  plotDensity: number;
  characterFocus: number;
  worldBuilding: number;
  politicalComplexity: number;
  moralAmbiguity: number;
  twistDensity: number;
  slowPayoff: number;
  relationshipFocus: number;
};

export type ExperienceDims = {
  pacing: number;
  cognitiveLoad: number;
  actionIntensity: number;
  emotionalIntensity: number;
  accessibility: number;
  episodicVsSerialised: number;
  commitment: number;
};

export type StructureDims = {
  episodeCount?: number;
  runtimeMinutes?: number;
  format?: string;
  storyCompleteness?: number;
  franchiseCommitment?: number;
};

export type StyleDims = {
  visualExperimentation: number;
  tonalVolatility: number;
  atmosphere: number;
  dialogueDensity: number;
};

export type FingerprintConfidence = {
  overall: number;
  dimensions: Partial<Record<string, number>>;
};

export type AnimePreferenceFingerprint = {
  version: string;
  animeId: number;
  emotional: EmotionalDims;
  narrative: NarrativeDims;
  experience: ExperienceDims;
  structure: StructureDims;
  style: StyleDims;
  confidence: FingerprintConfidence;
  provenance: {
    sources: FingerprintSource[];
    generatedAt: number;
  };
};

export type FingerprintVector = Record<string, number>;

export const EMOTIONAL_KEYS: (keyof EmotionalDims)[] = [
  "comfort",
  "melancholy",
  "hope",
  "darkness",
  "tension",
  "catharsis",
  "wonder",
  "humour",
  "romance",
];

export const NARRATIVE_KEYS: (keyof NarrativeDims)[] = [
  "mysteryDensity",
  "narrativeComplexity",
  "plotDensity",
  "characterFocus",
  "worldBuilding",
  "politicalComplexity",
  "moralAmbiguity",
  "twistDensity",
  "slowPayoff",
  "relationshipFocus",
];

export const EXPERIENCE_KEYS: (keyof ExperienceDims)[] = [
  "pacing",
  "cognitiveLoad",
  "actionIntensity",
  "emotionalIntensity",
  "accessibility",
  "episodicVsSerialised",
  "commitment",
];

export const STYLE_KEYS: (keyof StyleDims)[] = [
  "visualExperimentation",
  "tonalVolatility",
  "atmosphere",
  "dialogueDensity",
];

export function emptyEmotional(): EmotionalDims {
  return {
    comfort: 0.5,
    melancholy: 0.5,
    hope: 0.5,
    darkness: 0.5,
    tension: 0.5,
    catharsis: 0.5,
    wonder: 0.5,
    humour: 0.5,
    romance: 0.5,
  };
}

export function emptyNarrative(): NarrativeDims {
  return {
    mysteryDensity: 0.5,
    narrativeComplexity: 0.5,
    plotDensity: 0.5,
    characterFocus: 0.5,
    worldBuilding: 0.5,
    politicalComplexity: 0.5,
    moralAmbiguity: 0.5,
    twistDensity: 0.5,
    slowPayoff: 0.5,
    relationshipFocus: 0.5,
  };
}

export function emptyExperience(): ExperienceDims {
  return {
    pacing: 0.5,
    cognitiveLoad: 0.5,
    actionIntensity: 0.5,
    emotionalIntensity: 0.5,
    accessibility: 0.5,
    episodicVsSerialised: 0.5,
    commitment: 0.5,
  };
}

export function emptyStyle(): StyleDims {
  return {
    visualExperimentation: 0.5,
    tonalVolatility: 0.5,
    atmosphere: 0.5,
    dialogueDensity: 0.5,
  };
}

export function fingerprintToVector(
  fp: AnimePreferenceFingerprint,
): FingerprintVector {
  const v: FingerprintVector = {};
  for (const k of EMOTIONAL_KEYS) v[`emotional.${k}`] = fp.emotional[k];
  for (const k of NARRATIVE_KEYS) v[`narrative.${k}`] = fp.narrative[k];
  for (const k of EXPERIENCE_KEYS) v[`experience.${k}`] = fp.experience[k];
  for (const k of STYLE_KEYS) v[`style.${k}`] = fp.style[k];
  return v;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

export function emptyFingerprintVector(): FingerprintVector {
  const v: FingerprintVector = {};
  for (const k of EMOTIONAL_KEYS) v[`emotional.${k}`] = 0.5;
  for (const k of NARRATIVE_KEYS) v[`narrative.${k}`] = 0.5;
  for (const k of EXPERIENCE_KEYS) v[`experience.${k}`] = 0.5;
  for (const k of STYLE_KEYS) v[`style.${k}`] = 0.5;
  return v;
}
