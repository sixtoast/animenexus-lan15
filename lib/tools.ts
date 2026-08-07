import type { Anime } from "./types";

export function sharedTags(a: Anime, b: Anime): string[] {
  const setB = new Set(b.tags.map((t) => t.toLowerCase()));
  return a.tags.filter((t) => setB.has(t.toLowerCase()));
}

export function fusionScore(a: Anime, b: Anime): number {
  const shared = sharedTags(a, b).length;
  const scoreAvg = ((a.score || 0) + (b.score || 0)) / 2;
  return Math.min(
    100,
    Math.round(shared * 12 + scoreAvg * 6 + (a.format === b.format ? 8 : 0)),
  );
}

export function fusionBlurb(a: Anime, b: Anime): string {
  const shared = sharedTags(a, b);
  const vibe =
    shared.length >= 2
      ? `both pulse with ${shared.slice(0, 2).join(" & ")}`
      : shared.length === 1
        ? `they share a ${shared[0]} frequency`
        : "they sit on different bands of the dial";
  return `If ${a.title} and ${b.title} shared a night desk episode, ${vibe}. Score blend ★${(
    ((a.score || 0) + (b.score || 0)) /
    2
  ).toFixed(1)}.`;
}

export type ChallengeKind = "score" | "year" | "format";

export function challengePrompt(
  anime: Anime,
  kind: ChallengeKind,
): { question: string; answer: string } {
  if (kind === "score") {
    return {
      question: `What’s the community score (0–10) for “${anime.title}”? (±0.5 counts)`,
      answer: anime.score > 0 ? anime.score.toFixed(1) : "0",
    };
  }
  if (kind === "year") {
    return {
      question: `What year did “${anime.title}” start?`,
      answer: String(anime.year || "?"),
    };
  }
  return {
    question: `What format is “${anime.title}”? (TV, MOVIE, OVA…)`,
    answer: String(anime.format || "?"),
  };
}

export function checkChallenge(
  kind: ChallengeKind,
  anime: Anime,
  guess: string,
): boolean {
  const g = guess.trim().toLowerCase();
  if (kind === "score") {
    const n = parseFloat(g);
    if (Number.isNaN(n) || anime.score <= 0) return false;
    return Math.abs(n - anime.score) <= 0.5;
  }
  if (kind === "year") {
    return g === String(anime.year || "").toLowerCase();
  }
  return g === String(anime.format || "").toLowerCase();
}
