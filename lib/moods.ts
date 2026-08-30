/**
 * Mood routes → Viewing Intent (Recommendation Engine V2).
 * UI still lives at /mood/[slug]; underlying model is experiential intent,
 * not "sad = drama".
 */

import type { AnimeFilters } from "./types";
import {
  EXPERIENCE_INTENTS,
  getExperienceIntent,
  resolveIntentSlug,
  type ExperienceIntent,
} from "./viewing-intent";

export type MoodDef = {
  slug: string;
  label: string;
  emoji: string;
  blurb: string;
  genres: string[];
  sort: NonNullable<AnimeFilters["sort"]>;
  minScore?: number;
};

function toMood(e: ExperienceIntent): MoodDef {
  const sort =
    e.sort === "trending"
      ? "popularity"
      : e.sort === "score"
        ? "score"
        : "popularity";
  return {
    slug: e.slug,
    label: e.label,
    emoji: e.emoji,
    blurb: e.blurb,
    genres: e.genreHints,
    sort,
    minScore: e.minScore,
  };
}

/** Primary chips — experiential Viewing Intent. */
export const MOODS: MoodDef[] = EXPERIENCE_INTENTS.map(toMood);

export function getMood(slug: string): MoodDef | undefined {
  const resolved = resolveIntentSlug(slug);
  const exp = getExperienceIntent(resolved);
  if (exp) return toMood(exp);
  return MOODS.find((m) => m.slug === slug);
}

export function moodToFilters(mood: MoodDef): AnimeFilters {
  return {
    genre: mood.genres[0],
    sort: mood.sort,
    adultFilter: "exclude",
  };
}

/** @deprecated use getExperienceIntent — kept for imports */
export { EXPERIENCE_INTENTS, getExperienceIntent, resolveIntentSlug };
