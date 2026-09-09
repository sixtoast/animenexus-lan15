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
 * Catalog from the server; explicit Viewing Intent uses Ranker V3 fingerprint fit.
 * When AI is configured, semantic judge may modestly reorder the V3 shortlist.
 */
export function MoodFeedClient({ items, moodLabel, experienceSlug }: Props) {
  const { entries, ready } = useWatchlist();
  const sessionKey = useSessionRevision();
  const [aiOrdered, setAiOrdered] = useState<Anime[] | null>(null);
  const [judge, setJudge] = useState<SemanticJudgeResult | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const ordered = useMemo(() => {
    if (!ready || entries.length < 2 || items.length < 2) return items;
    const exclude = new Set<number>([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
    ]);
    const ranked = rankRecommendations(items, entries, {
      excludeIds: exclude,
      experienceSlug,
      forceVersion: experienceSlug ? "v3" : undefined,
    });
    if (!ranked.length) return items;
    const rankedIds = new Set(ranked.map((r) => r.anime.id));
    const tail = items.filter((a) => !rankedIds.has(a.id));
    return [...ranked.map((r) => r.anime), ...tail];
  }, [ready, entries, items, experienceSlug, sessionKey]);

  useEffect(() => {
    setAiOrdered(null);
    setJudge(null);
    if (!ready || entries.length < 2 || items.length < 4) return;
    if (typeof window === "undefined" || !isAIConfigured()) return;

    let cancelled = false;
    setAiBusy(true);

    (async () => {
      try {
        const exclude = new Set<number>([
          ...entries.map((e) => e.id),
          ...rejectedAnimeIds(),
        ]);
        const v3 = rankRecommendationsV3(items, entries, {
          excludeIds: exclude,
          experienceSlug,
        });
        if (!v3.length) return;
        const { ranked, judge: j } = await rankWithSemanticJudge(v3, entries, {
          experienceSlug,
          limit: 24,
        });
        if (cancelled) return;
        setJudge(j);
        if (j?.recommendations?.length) {
          const ids = new Set(ranked.map((r) => r.anime.id));
          const tail = items.filter((a) => !ids.has(a.id));
          setAiOrdered([...ranked.map((r) => r.anime), ...tail]);
        }
      } catch {
        if (!cancelled) {
          setAiOrdered(null);
          setJudge(null);
        }
      } finally {
        if (!cancelled) setAiBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, entries, items, experienceSlug, sessionKey]);

  const display = aiOrdered || ordered;

  const personalized = ready && entries.length >= 2;
  const trend =
    personalized && typeof window !== "undefined"
      ? preferenceTrendLine(entries)
      : null;

  const sess = typeof window !== "undefined" ? readIntentSession() : null;
  const dialNote =
    sess &&
    (sess.intensity !== "moderate" ||
      sess.energy !== "medium" ||
      sess.minutesAvailable != null)
      ? ` \u00b7 ${sess.intensity}/${sess.energy}${
          sess.minutesAvailable ? `/${sess.minutesAvailable}m` : ""
        }`
      : "";

  const topWhy =
    judge?.recommendations?.[0]?.why?.filter(Boolean).slice(0, 2) || [];

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
          {trend ? ` \u00b7 ${trend}` : ""}
          {dialNote}
          {aiBusy
            ? " \u00b7 Lantern is reading the room\u2026"
            : judge
              ? " \u00b7 semantic layer on"
              : " \u2014 preference prediction, not pure similarity."}
        </p>
      ) : null}
      {judge?.interpretation?.whatTheUserWants ? (
        <p className="meta" style={{ marginBottom: 10 }}>
          <strong>Tonight:</strong> {judge.interpretation.whatTheUserWants}
          {topWhy.length ? ` \u2014 ${topWhy.join(" \u00b7 ")}` : ""}
        </p>
      ) : null}
      <AnimeGrid items={display} trackBehaviour />
    </div>
  );
}
