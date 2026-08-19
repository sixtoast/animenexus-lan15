"use client";

import { useMemo } from "react";
import { AnimeGrid } from "@/components/AnimeGrid";
import { useWatchlist } from "@/components/WatchlistProvider";
import { rankRecommendations } from "@/lib/recommend-rank";
import { rejectedAnimeIds } from "@/lib/recommend-feedback";
import type { Anime } from "@/lib/types";

type Props = {
  items: Anime[];
  moodLabel: string;
};

/**
 * Mood / seasonal catalog from the server, optionally re-ordered by shelf resonance.
 * Cold shelf → original API order (no disruption).
 */
export function MoodFeedClient({ items, moodLabel }: Props) {
  const { entries, ready } = useWatchlist();

  const ordered = useMemo(() => {
    if (!ready || entries.length < 2 || items.length < 2) return items;
    const exclude = new Set<number>([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
    ]);
    const ranked = rankRecommendations(items, entries, {
      excludeIds: exclude,
      resonanceWeight: 0.6,
    });
    if (!ranked.length) return items;
    const rankedIds = new Set(ranked.map((r) => r.anime.id));
    const tail = items.filter((a) => !rankedIds.has(a.id));
    return [...ranked.map((r) => r.anime), ...tail];
  }, [ready, entries, items]);

  const personalized = ready && entries.length >= 2;

  return (
    <div>
      {personalized ? (
        <p
          className="meta"
          style={{ marginBottom: 12 }}
          role="status"
          aria-live="polite"
        >
          Ordered for your shelf within {moodLabel} — soft ranks, not a
          scoreboard.
        </p>
      ) : null}
      <AnimeGrid items={ordered} />
    </div>
  );
}
