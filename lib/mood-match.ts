/**
 * Hard mood ↔ genre/tag match. Used when fingerprints are flat / APIs degrade.
 */
import type { Anime } from "./types";
import type { ExperienceIntent } from "./viewing-intent";

/** AniList-style tags preferred for retrieval when AniList is up. */
export const MOOD_TAG_HINTS: Record<string, string[]> = {
  destroy: ["Tragedy", "Coming of Age", "Drama"],
  comfort: ["Iyashikei", "Slice of Life", "CGDCT"],
  think: ["Psychological", "Philosophy", "Detective"],
  laugh: ["Comedy", "Parody", "Gag Humor"],
  tense: ["Suspense", "Thriller", "Psychological"],
  wonder: ["Fantasy", "Adventure", "Space"],
  gentle: ["Iyashikei", "Slice of Life", "School"],
  chaotic: ["Comedy", "Action", "Parody"],
  romance: ["Romance", "School"],
  surprise: [],
};

/**
 * Jikan MAL genre IDs — queried ONE id at a time (AND of multiple ids is too narrow).
 * https://docs.api.jikan.moe/#tag/genres
 */
export const MOOD_JIKAN_GENRES: Record<string, number[]> = {
  destroy: [8, 40],
  comfort: [36, 23],
  think: [40, 7, 24],
  laugh: [4],
  tense: [41, 14, 7],
  wonder: [10, 2, 24],
  gentle: [36, 23],
  chaotic: [4, 1],
  romance: [22, 23],
  surprise: [],
};

/** Keywords that boost a mood when present in title/genre/tags. */
export const MOOD_KEYWORDS: Record<string, string[]> = {
  destroy: ["tragedy", "drama", "psychological", "grief", "melancholy", "bittersweet"],
  comfort: ["slice of life", "iyashikei", "healing", "cgdct", "wholesome", "cozy"],
  think: ["psychological", "mystery", "philosophy", "sci-fi", "detective"],
  laugh: ["comedy", "parody", "gag", "funny", "humor", "humour"],
  tense: ["thriller", "suspense", "horror", "mystery", "survival", "crime"],
  wonder: ["fantasy", "adventure", "space", "magic", "isekai"],
  gentle: ["slice of life", "school", "iyashikei", "soft", "quiet"],
  chaotic: ["comedy", "action", "parody", "absurd"],
  romance: ["romance", "love", "school", "relationship"],
  surprise: [],
};

const NEGATIVES: Record<string, string[]> = {
  destroy: ["comedy", "gag", "parody", "cgdct", "kids", "child"],
  comfort: ["horror", "thriller", "gore", "tragedy", "psychological"],
  laugh: ["tragedy", "horror", "psychological", "gore"],
  tense: ["slice of life", "cgdct", "iyashikei", "kids"],
  gentle: ["horror", "thriller", "gore", "ecchi", "mecha"],
  wonder: ["slice of life", "cgdct"],
  chaotic: ["iyashikei"],
  romance: ["horror", "mecha", "military"],
  think: ["cgdct", "kids", "gag"],
};

function labelsOf(anime: Anime): string[] {
  const out: string[] = [];
  for (const t of anime.tags || []) {
    if (t) out.push(String(t).toLowerCase());
  }
  if (anime.genre) {
    for (const g of String(anime.genre).split(/[,/|]/)) {
      const s = g.trim().toLowerCase();
      if (s) out.push(s);
    }
  }
  if (anime.title) out.push(anime.title.toLowerCase());
  if (anime.titleRomaji) out.push(String(anime.titleRomaji).toLowerCase());
  return out;
}

export function moodMatchScore(anime: Anime, intent: ExperienceIntent): number {
  const labels = labelsOf(anime);
  if (!labels.length) return 0.05;

  const slug = intent.slug;
  const positives = [
    ...(MOOD_TAG_HINTS[slug] || []),
    ...(MOOD_KEYWORDS[slug] || []),
    ...(intent.genreHints || []),
  ].map((x) => x.toLowerCase());

  if (!positives.length) return 0.35;

  let hit = 0;
  let weight = 0;
  for (const p of positives) {
    weight += 1;
    if (labels.some((l) => l === p || l.includes(p) || p.includes(l))) {
      hit += 1;
    }
  }
  let score = weight > 0 ? hit / Math.min(weight, 6) : 0.1;
  if (hit >= 2) score = Math.max(score, 0.55);
  if (hit >= 3) score = Math.max(score, 0.75);

  for (const n of NEGATIVES[slug] || []) {
    if (labels.some((l) => l === n || l.includes(n))) score -= 0.4;
  }

  return Math.max(0, Math.min(1, score));
}
