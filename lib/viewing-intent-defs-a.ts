/** Authored intents. */
import type { ExperienceIntent } from "./viewing-intent-types";

export const EXPERIENCE_INTENTS_A: ExperienceIntent[] = [
  {
    slug: "comfort", label: "Comfort me", emoji: "☕",
    blurb: "Warm, safe, restorative — low pressure.",
    target: { comfort: 0.92, valence: 0.72, intensity: 0.25, tension: 0.2, cognitiveLoad: 0.25, pacing: 0.3, hope: 0.75 },
    fingerprintTarget: {
      "emotional.comfort": 0.95, "emotional.hope": 0.82, "emotional.tension": 0.15, "emotional.darkness": 0.18,
      "experience.emotionalIntensity": 0.35, "experience.cognitiveLoad": 0.28, "experience.pacing": 0.34,
      "experience.accessibility": 0.86, "style.atmosphere": 0.72,
    },
    fingerprintWeights: { "emotional.comfort": 1.6, "emotional.tension": 1.25, "experience.cognitiveLoad": 1.2, "experience.accessibility": 1.1 },
    genreHints: ["Slice of Life", "Comedy", "Romance"], sort: "score", minScore: 65,
  },
  {
    slug: "destroy", label: "Destroy me", emoji: "💔",
    blurb: "Devastating emotional payoff — grief, catharsis, attachment.",
    target: { intensity: 0.9, melancholy: 0.88, valence: 0.28, darkness: 0.7, reflection: 0.8, comfort: 0.2 },
    fingerprintTarget: {
      "emotional.melancholy": 0.94, "emotional.catharsis": 0.95, "experience.emotionalIntensity": 0.93,
      "narrative.characterFocus": 0.78, "narrative.relationshipFocus": 0.72, "narrative.slowPayoff": 0.68,
      "emotional.comfort": 0.16, "emotional.darkness": 0.68, "emotional.hope": 0.42,
    },
    fingerprintWeights: {
      "emotional.melancholy": 1.5, "emotional.catharsis": 1.7, "experience.emotionalIntensity": 1.5,
      "narrative.characterFocus": 1.15, "emotional.darkness": 0.7,
    },
    genreHints: ["Drama", "Romance", "Psychological"], sort: "score", minScore: 70,
  },
  {
    slug: "think", label: "Make me think", emoji: "🧠",
    blurb: "Dense ideas, mystery, ambiguity, complex structure.",
    target: { cognitiveLoad: 0.9, reflection: 0.88, tension: 0.65, pacing: 0.4, darkness: 0.55 },
    fingerprintTarget: {
      "experience.cognitiveLoad": 0.94, "narrative.narrativeComplexity": 0.92, "narrative.mysteryDensity": 0.78,
      "narrative.moralAmbiguity": 0.78, "narrative.plotDensity": 0.76, "narrative.twistDensity": 0.66,
      "style.dialogueDensity": 0.7, "experience.pacing": 0.48,
    },
    fingerprintWeights: {
      "experience.cognitiveLoad": 1.6, "narrative.narrativeComplexity": 1.6,
      "narrative.mysteryDensity": 1.15, "narrative.moralAmbiguity": 1.1,
    },
    genreHints: ["Psychological", "Mystery", "Sci-Fi"], sort: "score", minScore: 70,
  },
  {
    slug: "laugh", label: "Make me laugh", emoji: "😂",
    blurb: "Actually funny first — not merely light-hearted.",
    target: { humour: 0.95, valence: 0.85, arousal: 0.7, comfort: 0.65, intensity: 0.35 },
    fingerprintTarget: {
      "emotional.humour": 0.97, "emotional.comfort": 0.62, "emotional.darkness": 0.22,
      "experience.accessibility": 0.78, "experience.emotionalIntensity": 0.42, "style.tonalVolatility": 0.58,
    },
    fingerprintWeights: { "emotional.humour": 2.0, "emotional.darkness": 0.7 },
    genreHints: ["Comedy", "Slice of Life", "Romance"], sort: "popularity",
  },
  {
    slug: "tense", label: "Keep me tense", emoji: "⚡",
    blurb: "Suspense, pressure, uncertainty — not just action.",
    target: { tension: 0.92, arousal: 0.85, intensity: 0.8, pacing: 0.75, cognitiveLoad: 0.55 },
    fingerprintTarget: {
      "emotional.tension": 0.96, "experience.emotionalIntensity": 0.82, "experience.pacing": 0.78,
      "narrative.plotDensity": 0.78, "narrative.mysteryDensity": 0.62, "experience.actionIntensity": 0.62,
      "emotional.comfort": 0.2,
    },
    fingerprintWeights: { "emotional.tension": 1.8, "experience.pacing": 1.25, "narrative.plotDensity": 1.1 },
    genreHints: ["Thriller", "Mystery", "Action", "Horror"], sort: "popularity",
  },
  {
    slug: "wonder", label: "Give me wonder", emoji: "✨",
    blurb: "Awe, discovery, atmosphere, world-building.",
    target: { wonder: 0.95, hope: 0.7, valence: 0.65, pacing: 0.45, intensity: 0.5 },
    fingerprintTarget: {
      "emotional.wonder": 0.97, "narrative.worldBuilding": 0.9, "style.atmosphere": 0.86,
      "style.visualExperimentation": 0.66, "emotional.hope": 0.7, "experience.pacing": 0.5,
    },
    fingerprintWeights: { "emotional.wonder": 1.8, "narrative.worldBuilding": 1.5, "style.atmosphere": 1.25 },
    genreHints: ["Fantasy", "Adventure", "Sci-Fi"], sort: "popularity",
  },
];
