"use client";

import { useMemo } from "react";
import { AnimeGrid } from "@/components/AnimeGrid";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  preferenceTrendLine,
  rankRecommendations,
} from "@/lib/recommend-rank";
import { rejectedAnimeIds } from "@/lib/recommend-feedback";
import type { Anime } from "@/lib/types";

type Props = {
  items: Anime[];
  moodLabel: string;
  /** Viewing Intent slug (e.g. comfort, destroy) */
  experienceSlug?: string;
};

/**
 * Catalog from the server, re-ordered by Preference Engine V2 when shelf is warm.
 */
export function MoodFeedClient({ items, moodLabel, experienceSlug }: Props) {
  const { entries, ready } = useWatchlist();

  const ordered = useMemo(() => {
    if (!ready || entries.length < 2 || items.length < 2) return items;
    const exclude = new Set<number>([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
    ]);
    const ranked = rankRecommendations(items, entries, {
      excludeIds: exclude,
      experienceSlug,
    });
    if (!ranked.length) return items;
    const rankedIds = new Set(ranked.map((r) => r.anime.id));
    const tail = items.filter((a) => !rankedIds.has(a.id));
    return [...ranked.map((r) => r.anime), ...tail];
  }, [ready, entries, items, experienceSlug]);

  const personalized = ready && entries.length >= 2;
  const trend =
    personalized && typeof window !== "undefined"
      ? preferenceTrendLine(entries)
      : null;

  return (
    <div>
      {personalized ? (
        <p
          className="meta"
          style={{ marginBottom: 12 }}
          role="status"
          aria-live="polite"
        >
          Ranked for your interest modes within {moodLabel}
          {trend ? ` · ${trend}` : ""} — preference prediction, not pure
          similarity.
        </p>
      ) : null}
      <AnimeGrid items={ordered} trackBehaviour />
    </div>
  );
}
