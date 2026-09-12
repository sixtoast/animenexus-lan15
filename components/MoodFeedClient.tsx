"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimeGrid } from "@/components/AnimeGrid";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  preferenceTrendLine,
  rankRecommendations,
} from "@/lib/recommend-rank";
import { rejectedAnimeIds } from "@/lib/recommend-feedback";
import { readIntentSession } from "@/lib/intent-session";
import { useSessionRevision } from "@/lib/use-session-revision";
import { isAIConfigured } from "@/lib/ai-settings";
import { rankRecommendationsV3 } from "@/lib/intelligence/recommendation/ranker-v3";
import {
  rankWithSemanticJudge,
  type SemanticJudgeResult,
} from "@/lib/intelligence/ai/semantic-judge";
import {
  filterOutWatched,
  moodExcludeIds,
} from "@/lib/watchlist-match";
import type { Anime } from "@/lib/types";

type Props = {
  items: Anime[];
  moodLabel: string;
  experienceSlug?: string;
};

/**
 * Mood feeds: Ranker V3 + hide completed/dropped shelf titles.
 * Watching / planning stay visible and are flagged on the card.
 */
export function MoodFeedClient({
  items,
  moodLabel,
  experienceSlug,
}: Props) {
  const { entries, ready } = useWatchlist();
  const sessionKey = useSessionRevision();
  const [aiOrdered, setAiOrdered] = useState<Anime[] | null>(null);
  const [judge, setJudge] = useState<SemanticJudgeResult | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const { pool, hiddenWatched } = useMemo(() => {
    if (!ready || !entries.length) {
      return { pool: items, hiddenWatched: 0 };
    }
    const { visible, hidden } = filterOutWatched(items, entries);
    return { pool: visible, hiddenWatched: hidden };
  }, [items, entries, ready]);

  const ordered = useMemo(() => {
    if (pool.length < 1) return pool;

    const exclude = moodExcludeIds(entries, rejectedAnimeIds());
    // Also exclude any id that survived filterOutWatched edge cases
    for (const e of entries) {
      if (e.watchStatus === "completed" || e.watchStatus === "dropped") {
        exclude.add(e.id);
      }
    }
    const session = readIntentSession();

    if (experienceSlug) {
      try {
        const v3 = rankRecommendationsV3(pool, entries, {
          excludeIds: exclude,
          experienceSlug,
          session,
        });
        if (v3.length) {
          const rankedIds = new Set(v3.map((r) => r.anime.id));
          const tail = pool.filter(
            (a) => !rankedIds.has(a.id) && !exclude.has(a.id),
          );
          return [...v3.map((r) => r.anime), ...tail];
        }
      } catch {
        /* fall through */
      }
      return pool.filter((a) => !exclude.has(a.id));
    }

    if (!ready || entries.length < 2) return pool;

    const ranked = rankRecommendations(pool, entries, {
      excludeIds: exclude,
      experienceSlug,
    });
    if (!ranked.length) return pool;
    const rankedIds = new Set(ranked.map((r) => r.anime.id));
    const tail = pool.filter((a) => !rankedIds.has(a.id) && !exclude.has(a.id));
    return [...ranked.map((r) => r.anime), ...tail];
  }, [ready, entries, pool, experienceSlug, sessionKey]);

  useEffect(() => {
    setAiOrdered(null);
    setJudge(null);
    if (pool.length < 4) return;
    if (!ready || entries.length < 2) return;
    if (typeof window === "undefined" || !isAIConfigured()) return;

    let cancelled = false;
    setAiBusy(true);

    (async () => {
      try {
        const exclude = moodExcludeIds(entries, rejectedAnimeIds());
        const session = readIntentSession();
        const v3 = rankRecommendationsV3(pool, entries, {
          excludeIds: exclude,
          experienceSlug,
          session,
        });
        const { ranked, judge: j } = await rankWithSemanticJudge(v3, entries, {
          experienceSlug,
          limit: 24,
        });
        if (cancelled) return;
        setJudge(j);
        if (ranked.length) {
          const ids = new Set(ranked.map((r) => r.anime.id));
          const tail = pool.filter(
            (a) => !ids.has(a.id) && !exclude.has(a.id),
          );
          setAiOrdered([...ranked.map((r) => r.anime), ...tail]);
        }
      } catch {
        if (!cancelled) {
          setJudge(null);
          setAiOrdered(null);
        }
      } finally {
        if (!cancelled) setAiBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, entries, pool, experienceSlug, sessionKey]);

  const display = aiOrdered ?? ordered;
  const trend =
    ready && entries.length >= 2 ? preferenceTrendLine(entries) : null;

  return (
    <div className="mood-feed">
      {trend ? (
        <p className="mood-feed-trend muted" style={{ marginBottom: 12 }}>
          {trend}
        </p>
      ) : null}
      {experienceSlug ? (
        <p className="mood-feed-rank-note muted" style={{ marginBottom: 8 }}>
          Ranked for <strong>{moodLabel}</strong>
          {entries.length < 2
            ? " by viewing intent (add shelf titles for taste personalisation)"
            : " by viewing intent + your shelf"}
          {" \u00b7 session controls applied"}
          {hiddenWatched > 0
            ? ` \u00b7 ${hiddenWatched} completed/dropped hidden`
            : ""}
          {aiBusy
            ? " \u00b7 refining\u2026"
            : judge?.recommendations?.length
              ? " \u00b7 AI refined"
              : ""}
        </p>
      ) : null}
      <AnimeGrid items={display} trackBehaviour />
    </div>
  );
}
