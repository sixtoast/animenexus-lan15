/** Authored intents (part B). */
import type { ExperienceIntent } from "./viewing-intent-types";
import { EXPERIENCE_INTENTS_A } from "./viewing-intent-defs-a";

const B: ExperienceIntent[] = [
  {
    slug: "gentle", label: "Something gentle", emoji: "🍃",
    blurb: "Soft, slow, quiet — low pressure, not necessarily happy.",
    target: { comfort: 0.85, pacing: 0.22, intensity: 0.2, arousal: 0.25, reflection: 0.7, valence: 0.65 },
    fingerprintTarget: {
      "experience.pacing": 0.2, "experience.actionIntensity": 0.16, "experience.emotionalIntensity": 0.3,
      "emotional.tension": 0.14, "emotional.comfort": 0.8, "style.atmosphere": 0.78,
      "narrative.characterFocus": 0.7, "experience.accessibility": 0.82,
    },
    fingerprintWeights: { "experience.pacing": 1.35, "emotional.tension": 1.4, "experience.actionIntensity": 1.2 },
    genreHints: ["Slice of Life", "Drama", "Romance"], sort: "score", minScore: 65,
  },
  {
    slug: "chaotic", label: "Something chaotic", emoji: "🌀",
    blurb: "Fast, unpredictable, absurd, high-energy.",
    target: { arousal: 0.92, humour: 0.8, pacing: 0.85, intensity: 0.7, comfort: 0.4 },
    fingerprintTarget: {
      "experience.pacing": 0.92, "style.tonalVolatility": 0.94, "experience.actionIntensity": 0.74,
      "emotional.humour": 0.72, "experience.emotionalIntensity": 0.7, "narrative.plotDensity": 0.66,
      "experience.accessibility": 0.58,
    },
    fingerprintWeights: { "style.tonalVolatility": 1.7, "experience.pacing": 1.5, "emotional.humour": 1.0 },
    genreHints: ["Comedy", "Action", "Supernatural"], sort: "popularity",
  },
  {
    slug: "romance", label: "Romance", emoji: "💗",
    blurb: "Relationship development itself matters.",
    target: { romance: 0.92, valence: 0.7, melancholy: 0.45, comfort: 0.55, intensity: 0.5 },
    fingerprintTarget: {
      "emotional.romance": 0.97, "narrative.relationshipFocus": 0.95, "narrative.characterFocus": 0.82,
      "experience.emotionalIntensity": 0.66, "emotional.catharsis": 0.62, "emotional.comfort": 0.58,
    },
    fingerprintWeights: { "emotional.romance": 1.9, "narrative.relationshipFocus": 1.8, "narrative.characterFocus": 1.1 },
    genreHints: ["Romance", "Drama", "Comedy"], sort: "score",
  },
  {
    slug: "surprise", label: "Surprise me", emoji: "🎲",
    blurb: "Novelty and exploration — not a fake mood match.",
    target: {}, fingerprintTarget: {}, fingerprintWeights: {},
    genreHints: [], sort: "trending",
  },
];

export const EXPERIENCE_INTENTS: ExperienceIntent[] = [
  ...EXPERIENCE_INTENTS_A,
  ...B,
];
