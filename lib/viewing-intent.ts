/**
 * Viewing Intent model (replaces crude Mood = genre).
 * Separates: current emotional state vs desired experience.
 * Mood UI maps to experiential intents; ranking uses multidimensional fingerprints.
 */

export type IntentDim =
  | "valence"
  | "arousal"
  | "comfort"
  | "intensity"
  | "tension"
  | "darkness"
  | "hope"
  | "melancholy"
  | "humour"
  | "wonder"
  | "romance"
  | "reflection"
  | "cognitiveLoad"
  | "pacing";

export type IntentVector = Record<IntentDim, number>;

export const INTENT_DIMS: IntentDim[] = [
  "valence",
  "arousal",
  "comfort",
  "intensity",
  "tension",
  "darkness",
  "hope",
  "melancholy",
  "humour",
  "wonder",
  "romance",
  "reflection",
  "cognitiveLoad",
  "pacing",
];

export function emptyIntent(): IntentVector {
  const v = {} as IntentVector;
  for (const d of INTENT_DIMS) v[d] = 0.5;
  return v;
}

/** Experiential UI intents — not genres. */
export type ExperienceIntent = {
  slug: string;
  label: string;
  emoji: string;
  blurb: string;
  /** Target fingerprint the ranker steers toward */
  target: Partial<IntentVector>;
  /** Soft genre hints for candidate fetch only */
  genreHints: string[];
  sort: "score" | "popularity" | "trending";
  minScore?: number;
};

export const EXPERIENCE_INTENTS: ExperienceIntent[] = [
  {
    slug: "comfort",
    label: "Comfort me",
    emoji: "☕",
    blurb: "Warm, gentle, low cognitive load.",
    target: {
      comfort: 0.92,
      valence: 0.72,
      intensity: 0.25,
      tension: 0.2,
      cognitiveLoad: 0.25,
      pacing: 0.3,
      hope: 0.75,
    },
    genreHints: ["Slice of Life"],
    sort: "score",
    minScore: 65,
  },
  {
    slug: "destroy",
    label: "Destroy me",
    emoji: "💔",
    blurb: "Emotionally heavy — intensity with purpose.",
    target: {
      intensity: 0.9,
      melancholy: 0.88,
      valence: 0.28,
      darkness: 0.7,
      reflection: 0.8,
      comfort: 0.2,
    },
    genreHints: ["Drama"],
    sort: "score",
    minScore: 70,
  },
  {
    slug: "think",
    label: "Make me think",
    emoji: "🧠",
    blurb: "High cognitive load, mystery, moral weight.",
    target: {
      cognitiveLoad: 0.9,
      reflection: 0.88,
      tension: 0.65,
      pacing: 0.4,
      darkness: 0.55,
    },
    genreHints: ["Psychological"],
    sort: "score",
    minScore: 70,
  },
  {
    slug: "laugh",
    label: "Make me laugh",
    emoji: "😂",
    blurb: "Humour-forward, energy optional.",
    target: {
      humour: 0.95,
      valence: 0.85,
      arousal: 0.7,
      comfort: 0.65,
      intensity: 0.35,
    },
    genreHints: ["Comedy"],
    sort: "popularity",
  },
  {
    slug: "tense",
    label: "Keep me tense",
    emoji: "⚡",
    blurb: "Suspense, stakes, forward momentum.",
    target: {
      tension: 0.92,
      arousal: 0.85,
      intensity: 0.8,
      pacing: 0.75,
      cognitiveLoad: 0.55,
    },
    genreHints: ["Action", "Thriller"],
    sort: "popularity",
  },
  {
    slug: "wonder",
    label: "Give me wonder",
    emoji: "✨",
    blurb: "Awe, fantasy, otherworlds.",
    target: {
      wonder: 0.95,
      hope: 0.7,
      valence: 0.65,
      pacing: 0.45,
      intensity: 0.5,
    },
    genreHints: ["Fantasy"],
    sort: "popularity",
  },
  {
    slug: "gentle",
    label: "Something gentle",
    emoji: "🍃",
    blurb: "Soft pacing, low intensity, reflective.",
    target: {
      comfort: 0.85,
      pacing: 0.22,
      intensity: 0.2,
      arousal: 0.25,
      reflection: 0.7,
      valence: 0.65,
    },
    genreHints: ["Slice of Life"],
    sort: "score",
    minScore: 65,
  },
  {
    slug: "chaotic",
    label: "Something chaotic",
    emoji: "🌀",
    blurb: "High energy, absurd, ensemble chaos.",
    target: {
      arousal: 0.92,
      humour: 0.8,
      pacing: 0.85,
      intensity: 0.7,
      comfort: 0.4,
    },
    genreHints: ["Comedy", "Action"],
    sort: "popularity",
  },
  {
    slug: "romance",
    label: "Romance",
    emoji: "💗",
    blurb: "Relationship-forward emotional arcs.",
    target: {
      romance: 0.92,
      valence: 0.7,
      melancholy: 0.45,
      comfort: 0.55,
      intensity: 0.5,
    },
    genreHints: ["Romance"],
    sort: "score",
  },
  {
    slug: "surprise",
    label: "Surprise me",
    emoji: "🎲",
    blurb: "Novelty-weighted — step outside the usual.",
    target: {
      wonder: 0.6,
      intensity: 0.55,
      cognitiveLoad: 0.5,
    },
    genreHints: [],
    sort: "trending",
  },
];

export function getExperienceIntent(slug: string): ExperienceIntent | undefined {
  return EXPERIENCE_INTENTS.find((e) => e.slug === slug);
}

/** Map legacy mood slugs → new experience intents. */
export const LEGACY_MOOD_MAP: Record<string, string> = {
  chill: "gentle",
  hype: "tense",
  cry: "destroy",
  laugh: "laugh",
  romance: "romance",
  spooky: "tense",
  fantasy: "wonder",
  mind: "think",
  scifi: "wonder",
  masterpiece: "surprise",
};

export function resolveIntentSlug(slug: string): string {
  if (getExperienceIntent(slug)) return slug;
  return LEGACY_MOOD_MAP[slug] || slug;
}

/**
 * Rough anime → intent fingerprint from genres/tags.
 * Not a full embedding — good enough for V2 ranking constraints.
 */
export function animeIntentFingerprint(tags: string[] | undefined): IntentVector {
  const v = emptyIntent();
  const t = (tags || []).map((x) => x.toLowerCase());
  const has = (s: string) => t.some((x) => x.includes(s));

  if (has("comedy")) {
    v.humour = 0.9;
    v.valence = 0.8;
    v.arousal = 0.7;
  }
  if (has("drama")) {
    v.intensity = 0.7;
    v.melancholy = 0.65;
    v.reflection = 0.7;
  }
  if (has("slice of life")) {
    v.comfort = 0.85;
    v.pacing = 0.3;
    v.arousal = 0.3;
  }
  if (has("action") || has("adventure")) {
    v.arousal = 0.85;
    v.pacing = 0.8;
    v.intensity = 0.75;
  }
  if (has("horror") || has("thriller")) {
    v.tension = 0.9;
    v.darkness = 0.8;
    v.comfort = 0.15;
  }
  if (has("romance")) v.romance = 0.9;
  if (has("psychological") || has("mystery")) {
    v.cognitiveLoad = 0.85;
    v.tension = 0.7;
    v.reflection = 0.75;
  }
  if (has("fantasy") || has("sci-fi") || has("scifi")) {
    v.wonder = 0.85;
  }
  if (has("sports")) {
    v.arousal = 0.8;
    v.hope = 0.75;
  }
  return v;
}

export function intentSimilarity(a: IntentVector, b: IntentVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const d of INTENT_DIMS) {
    const x = a[d] ?? 0.5;
    const y = b[d] ?? 0.5;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na < 1e-9 || nb < 1e-9) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function blendIntent(
  base: IntentVector,
  overlay: Partial<IntentVector>,
  weight = 0.55,
): IntentVector {
  const out = { ...base };
  for (const d of INTENT_DIMS) {
    if (overlay[d] != null) {
      out[d] = base[d] * (1 - weight) + (overlay[d] as number) * weight;
    }
  }
  return out;
}
