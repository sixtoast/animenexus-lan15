"use client";

import { useEffect, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import type { Anime } from "@/lib/types";

export function useHomePersonalizedPool(fallback: Anime[], limit = 120) {
  const { entries, ready } = useWatchlist();
  const [pool, setPool] = useState<Anime[]>(fallback);

  useEffect(() => {
    setPool(fallback);
  }, [fallback]);

  useEffect(() => {
    if (!ready || entries.length < 2) return;
    let cancelled = false;
    fetch("/api/recommend/pool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: entries.slice(0, 120),
        maxPool: Math.max(limit, 120),
        perSource: 36,
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const data = Array.isArray(json.data) ? json.data as Anime[] : [];
        if (data.length) setPool(data);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [entries, ready, limit]);

  return { pool, entries, ready };
}
