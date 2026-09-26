"use client";

import { useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readIntentSession } from "@/lib/intent-session";
import { rankRecommendationsV3 } from "@/lib/intelligence/recommendation/ranker-v3";
import type { Anime } from "@/lib/types";

function unique(list: Anime[]) {
  const seen = new Set<number>();
  return list.filter((a) => {
    if (!a?.id || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export function useHomePersonalizedPool(fallback: Anime[], limit = 120) {
  const { entries, ready } = useWatchlist();
  const [pool, setPool] = useState<Anime[]>(fallback);
  const [surprisePool, setSurprisePool] = useState<Anime[]>([]);

  useEffect(() => { setPool(fallback); }, [fallback]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const base = {
      entries: entries.slice(0, 200),
      maxPool: Math.max(limit, 160),
      perSource: 36,
    };
    const requests = [
      fetch("/api/recommend/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, experienceSlug: readIntentSession().slug || undefined }),
      }).then((r) => r.json()),
      fetch("/api/recommend/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, experienceSlug: "surprise" }),
      }).then((r) => r.json()),
    ];

    Promise.all(requests)
      .then(([normal, surprise]) => {
        if (cancelled) return;
        const normalData = Array.isArray(normal?.data) ? normal.data as Anime[] : [];
        const surpriseData = Array.isArray(surprise?.data) ? surprise.data as Anime[] : [];
        if (normalData.length) setPool(normalData);
        if (surpriseData.length) setSurprisePool(surpriseData);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [entries, ready, limit]);

  const ranked = useMemo(() => {
    const base = unique(pool);
    if (!ready || entries.length === 0) return base;
    return rankRecommendationsV3(base, entries, {
      experienceSlug: readIntentSession().slug || undefined,
      excludeIds: new Set(entries.map((e) => e.id)),
    }).map((r) => r.anime);
  }, [pool, entries, ready]);

  const surprise = useMemo(() => {
    const base = unique(surprisePool.length ? surprisePool : pool);
    if (!ready || entries.length === 0) return base;
    return rankRecommendationsV3(base, entries, {
      experienceSlug: "surprise",
      excludeIds: new Set(entries.map((e) => e.id)),
    }).map((r) => r.anime);
  }, [surprisePool, pool, entries, ready]);

  return {
    pool: unique(ranked),
    surprise: unique(surprise),
    entries,
    ready,
    personalised: ready && entries.length > 0,
  };
}
