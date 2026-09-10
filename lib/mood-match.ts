/**
 * Hard mood ↔ genre/tag match. Used when fingerprints are flat.
 */
import type { Anime } from "./types";
import type { ExperienceIntent } from "./viewing-intent";

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

export const MOOD_JIKAN_GENRES: Record<string, number[]> = {
  destroy: [8, 40, 7],
  comfort: [36, 23],
  think: [40, 7, 41],
  laugh: [4],
  tense: [41, 14, 7],
  wonder: [10, 2, 24],
  gentle: [36, 23],
  chaotic: [4, 1],
  romance: [22, 23],
  surprise: [],
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
  return out;
}

export function moodMatchScore(anime: Anime, intent: ExperienceIntent): number {
  const labels = labelsOf(anime);
  if (!labels.length) return 0.15;

  const positives = [
    ...(MOOD_TAG_HINTS[intent.slug] || []),
    ...(intent.genreHints || []),
  ].map((x) => x.toLowerCase());

  const negatives: Record<string, string[]> = {
    destroy: ["comedy", "gag humor", "parody", "cgdct", "kids"],
    comfort: ["horror", "thriller", "gore", "tragedy"],
    laugh: ["tragedy", "horror", "psychological"],
    tense: ["slice of life", "cgdct", "iyashikei"],
    gentle: ["horror", "thriller", "gore", "ecchi"],
    romance: ["horror", "mecha"],
  };
  const neg = (negatives[intent.slug] || []).map((x) => x.toLowerCase());

  let hit = 0;
  let weight = 0;
  for (const p of positives) {
    weight += 1;
    if (labels.some((l) => l === p || l.includes(p) || p.includes(l))) hit += 1;
  }
  let score = weight > 0 ? hit / weight : 0.2;
  for (const n of neg) {
    if (labels.some((l) => l === n || l.includes(n))) score -= 0.35;
  }
  return Math.max(0, Math.min(1, score));
}
