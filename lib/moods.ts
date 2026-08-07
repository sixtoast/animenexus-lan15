/**
 * Mood → AniList query mapping (genres / tags / sort).
 */

import type { AnimeFilters } from "./types";

export type MoodDef = {
  slug: string;
  label: string;
  emoji: string;
  blurb: string;
  genres: string[];
  sort: NonNullable<AnimeFilters["sort"]>;
  minScore?: number;
};

export const MOODS: MoodDef[] = [
  {
    slug: "chill",
    label: "Chill",
    emoji: "🍃",
    blurb: "Soft slice-of-life and gentle days.",
    genres: ["Slice of Life"],
    sort: "score",
    minScore: 65,
  },
  {
    slug: "hype",
    label: "Hype",
    emoji: "⚡",
    blurb: "Action, shonen energy, peak fights.",
    genres: ["Action"],
    sort: "popularity",
  },
  {
    slug: "cry",
    label: "Cry",
    emoji: "💧",
    blurb: "Drama that hits where it hurts.",
    genres: ["Drama"],
    sort: "score",
    minScore: 70,
  },
  {
    slug: "laugh",
    label: "Laugh",
    emoji: "😂",
    blurb: "Comedy and pure silliness.",
    genres: ["Comedy"],
    sort: "popularity",
  },
  {
    slug: "romance",
    label: "Romance",
    emoji: "💗",
    blurb: "Butterflies, slow burns, confessions.",
    genres: ["Romance"],
    sort: "score",
  },
  {
    slug: "spooky",
    label: "Spooky",
    emoji: "👻",
    blurb: "Horror, dread, late-night thrills.",
    genres: ["Horror"],
    sort: "popularity",
  },
  {
    slug: "fantasy",
    label: "Fantasy",
    emoji: "✨",
    blurb: "Magic, isekai, other worlds.",
    genres: ["Fantasy"],
    sort: "popularity",
  },
  {
    slug: "mind",
    label: "Mind-bender",
    emoji: "🧠",
    blurb: "Psychological twists and mysteries.",
    genres: ["Psychological"],
    sort: "score",
    minScore: 70,
  },
  {
    slug: "scifi",
    label: "Sci-Fi",
    emoji: "🚀",
    blurb: "Mechs, space, near-future visions.",
    genres: ["Sci-Fi"],
    sort: "score",
  },
  {
    slug: "masterpiece",
    label: "Masterpiece",
    emoji: "👑",
    blurb: "Highest-rated signal — pure quality.",
    genres: [],
    sort: "score",
    minScore: 85,
  },
];

export function getMood(slug: string): MoodDef | undefined {
  return MOODS.find((m) => m.slug === slug);
}

export function moodToFilters(mood: MoodDef): AnimeFilters {
  return {
    genre: mood.genres[0],
    sort: mood.sort,
    adultFilter: "exclude",
  };
}
