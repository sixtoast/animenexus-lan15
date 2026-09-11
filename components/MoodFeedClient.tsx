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
import type { Anime } from "@/lib/types";

type Props = {
  items: Anime[];
  moodLabel: string;
  experienceSlug?: string;
};

/**
 * Mood + general feeds: rank with Ranker V3 so Energy / Attention / Intensity
 * from IntentSession actually move the list. Server still pre-filters by mood.
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

  const ordered = useMemo(() => {
    if (items.length < 2) return items;

    const exclude = new Set<number>([
      ...(ready ? entries.map((e) => e.id) : []),
      ...rejectedAnimeIds(),
    ]);
    const session = readIntentSession();

    // Explicit mood: V3 with high viewingIntent weight + live session controls
    if (experienceSlug) {
      try {
        const v3 = rankRecommendationsV3(items, entries, {
          excludeIds: exclude,
          experienceSlug,
          session,
        });
        if (v3.length) {
          const rankedIds = new Set(v3.map((r) => r.anime.id));
          const tail = items.filter(
            (a) => !rankedIds.has(a.id) && !exclude.has(a.id),
          );
          return [...v3.map((r) => r.anime), ...tail];
        }
      } catch {
        /* fall through to filter-only */
      }
      if (!exclude.size) return items;
      return items.filter((a) => !exclude.has(a.id));
    }

    if (!ready || entries.length < 2) return items;

    const ranked = rankRecommendations(items, entries, {
      excludeIds: exclude,
      experienceSlug,
    });
    if (!ranked.length) return items;
    const rankedIds = new Set(ranked.map((r) => r.anime.id));
    const tail = items.filter((a) => !rankedIds.has(a.id));
    return [...ranked.map((r) => r.anime), ...tail];
  }, [ready, entries, items, experienceSlug, sessionKey]);

  useEffect(() => {
    setAiOrdered(null);
    setJudge(null);
    if (items.length < 4) return;
    if (!ready || entries.length < 2) return;
    if (typeof window === "undefined" || !isAIConfigured()) return;

    let cancelled = false;
    setAiBusy(true);

    (async () => {
      try {
        const exclude = new Set<number>([
          ...(ready ? entries.map((e) => e.id) : []),
          ...rejectedAnimeIds(),
        ]);
        const session = readIntentSession();
        const v3 = rankRecommendationsV3(items, entries, {
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
          const tail = items.filter((a) => !ids.has(a.id));
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
  }, [ready, entries, items, experienceSlug, sessionKey]);

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
          {" · session controls applied"}
          {aiBusy
            ? " · refining…"
            : judge?.recommendations?.length
              ? " · AI refined"
              : ""}
        </p>
      ) : null}
      <AnimeGrid items={display} trackBehaviour />
    </div>
  );
}
