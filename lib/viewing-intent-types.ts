/** Viewing intent shared types. */
export type IntentDim =
  | "valence" | "arousal" | "comfort" | "intensity" | "tension" | "darkness"
  | "hope" | "melancholy" | "humour" | "wonder" | "romance" | "reflection"
  | "cognitiveLoad" | "pacing";

export type IntentVector = Record<IntentDim, number>;
export type IntentFingerprintTarget = Partial<Record<string, number>>;
export type IntentFingerprintWeights = Partial<Record<string, number>>;

export type ExperienceIntent = {
  slug: string;
  label: string;
  emoji: string;
  blurb: string;
  target: Partial<IntentVector>;
  fingerprintTarget: IntentFingerprintTarget;
  fingerprintWeights?: IntentFingerprintWeights;
  genreHints: string[];
  sort: "score" | "popularity" | "trending";
  minScore?: number;
};

export type SessionIntentControls = {
  intensity?: "light" | "moderate" | "maximum";
  energy?: "low" | "medium" | "high";
  attention?: "easy" | "medium" | "demanding";
  minutesAvailable?: number | null;
};

export const INTENT_DIMS: IntentDim[] = [
  "valence","arousal","comfort","intensity","tension","darkness","hope",
  "melancholy","humour","wonder","romance","reflection","cognitiveLoad","pacing",
];
