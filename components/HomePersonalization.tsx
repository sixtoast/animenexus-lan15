"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readIntentSession } from "@/lib/intent-session";
import { rankRecommendationsV3 } from "@/lib/intelligence/recommendation/ranker-v3";
import type { Anime } from "@/lib/types";

type HomePersonalization = {
  items: Anime[];
  surprise: Anime[];
  ready: boolean;
  hasTaste: boolean;
  currentSeason: Anime[];
  upcoming: Anime[];
  archive: Anime[];
};

const Ctx = createContext<HomePersonalization | null>(null);

function unique(list: Anime[]) {
  const seen = new Set<number>();
  return list.filter((a) => {
    if (!a?.id || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export function HomePersonalizationProvider({ children, initial }: { children: React.ReactNode; initial: Anime[] }) {
  const { entries, ready: watchlistReady } = useWatchlist();
  const [pool, setPool] = useState<Anime[]>(initial);
  const [surprisePool, setSurprisePool] = useState<Anime[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!watchlistReady) return;
    let cancelled = false;
    const slug = readIntentSession().slug || undefined;
    const body = {
      entries: entries.slice(0, 200),
      experienceSlug: slug,
      maxPool: 320,
    };
    const surpriseBody = {
      entries: entries.slice(0, 200),
      experienceSlug: "surprise",
      maxPool: 220,
    };

    Promise.all([
      fetch("/api/recommend/pool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
      fetch("/api/recommend/pool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(surpriseBody) }).then((r) => r.json()),
    ])
      .then(([normal, surprise]) => {
        if (cancelled) return;
        if (Array.isArray(normal?.data) && normal.data.length) setPool(normal.data);
        if (Array.isArray(surprise?.data) && surprise.data.length) setSurprisePool(surprise.data);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [watchlistReady, entries]);

  const ranked = useMemo(() => {
    if (!watchlistReady || !entries.length) return unique(pool);
    return rankRecommendationsV3(pool, entries, {
      experienceSlug: readIntentSession().slug || undefined,
      excludeIds: new Set(entries.map((e) => e.id)),
    }).map((r) => r.anime);
  }, [pool, entries, watchlistReady]);

  const surprise = useMemo(() => {
    if (!watchlistReady || !entries.length) return unique(surprisePool.length ? surprisePool : pool);
    return rankRecommendationsV3(surprisePool.length ? surprisePool : pool, entries, {
      experienceSlug: "surprise",
      excludeIds: new Set(entries.map((e) => e.id)),
    }).map((r) => r.anime);
  }, [surprisePool, pool, entries, watchlistReady]);

  const items = unique(ranked.length ? ranked : pool);
  const now = new Date();
  const currentYear = now.getFullYear();
  const current = items.filter((a) => {
    const y = Number(a.seasonYear || a.year);
    return a.status === "RELEASING" || (y === currentYear && a.status !== "FINISHED");
  });
  const upcoming = items.filter((a) => a.status === "NOT_YET_RELEASED" || (Number(a.seasonYear || a.year) > currentYear));
  const used = new Set([...current, ...upcoming].map((a) => a.id));
  const archive = items.filter((a) => !used.has(a.id));

  return (
    <Ctx.Provider value={{
      items,
      surprise: unique(surprise),
      ready: watchlistReady && (loaded || !entries.length),
      hasTaste: entries.length > 0,
      currentSeason: unique(current),
      upcoming: unique(upcoming),
      archive: unique(archive),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHomePersonalization() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useHomePersonalization must be used inside HomePersonalizationProvider");
  return value;
}
