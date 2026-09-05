/**
 * Home priority engine (R7) — choose ONE primary action.
 * Intelligence is selective: one decision, not twelve widgets.
 */

import type { Anime, WatchlistEntry } from "./types";
import {
  rankRecommendations,
  preferenceTrendLine,
  type RankedRecommendation,
} from "./recommend-rank";

export type HomePrimaryType =
  | "continue"
  | "tonight_pick"
  | "taste_signal"
  | "explore"
  | "empty";

export type HomePrimary = {
  type: HomePrimaryType;
  title: string;
  subtitle: string;
  reason: string;
  href: string;
  cta: string;
  anime?: Anime;
  confidence?: RankedRecommendation["confidence"];
  score?: number;
};

function continueCandidates(entries: WatchlistEntry[]): WatchlistEntry[] {
  return entries
    .filter(
      (e) =>
        e.watchStatus === "watching" ||
        (e.watchStatus === "paused" && (e.progress || 0) > 0),
    )
    .sort((a, b) => {
      const ua = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const ub = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return ub - ua;
    });
}

/**
 * Priority order:
 * 1. Continue unfinished high-activity title
 * 2. Strong Tonight recommendation (when shelf + candidates exist)
 * 3. Taste drift insight
 * 4. Soft explore fallback
 */
export function chooseHomePrimary(
  entries: WatchlistEntry[],
  candidates: Anime[],
  opts?: { experienceSlug?: string },
): HomePrimary {
  const cont = continueCandidates(entries);
  if (cont[0]) {
    const e = cont[0];
    const ep =
      e.progress > 0
        ? `Episode ${e.progress}${e.episodes ? ` / ${e.episodes}` : ""}`
        : "In progress";
    return {
      type: "continue",
      title: e.title,
      subtitle: ep,
      reason: "Pick up where you left off.",
      href: `/anime/${e.id}`,
      cta: "Continue",
      anime: {
        id: e.id,
        title: e.title,
        image: e.image,
        score: e.score || 0,
        year: e.year,
        episodes: e.episodes,
        duration: e.duration,
        format: e.format,
        tags: e.genres || e.tags || [],
      } as Anime,
    };
  }

  if (entries.length >= 1 && candidates.length >= 4) {
    const ranked = rankRecommendations(candidates, entries, {
      excludeIds: entries.map((x) => x.id),
      experienceSlug: opts?.experienceSlug,
    });
    const top = ranked[0];
    if (top && top.score >= 0.35) {
      return {
        type: "tonight_pick",
        title: top.anime.title,
        subtitle: top.reasons[0] || "Lantern’s pick for now",
        reason: "One recommendation. Not a dashboard.",
        href: `/anime/${top.anime.id}`,
        cta: top.confidence === "strong" ? "Watch path" : "Consider this",
        anime: top.anime,
        confidence: top.confidence,
        score: top.score,
      };
    }
  }

  const trend = preferenceTrendLine(entries);
  if (trend) {
    return {
      type: "taste_signal",
      title: "Where your taste is moving",
      subtitle: trend,
      reason: "A quiet signal from your recent shelf.",
      href: "/taste",
      cta: "Open Taste",
    };
  }

  if (candidates[0]) {
    return {
      type: "explore",
      title: candidates[0].title,
      subtitle: "Something on the air right now",
      reason: "Start a shelf — Lantern learns from what you open.",
      href: `/anime/${candidates[0].id}`,
      cta: "Open",
      anime: candidates[0],
    };
  }

  return {
    type: "empty",
    title: "Your room is quiet",
    subtitle: "Browse a few titles or import a list.",
    reason: "Lantern needs a little history to choose well.",
    href: "/browse",
    cta: "Discover",
  };
}
