"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readIntentSession, writeIntentSession } from "@/lib/intent-session";
import { claimNexusCommand, onNexusSignal } from "@/lib/nexus-intelligence";
import { rankRecommendationsV3 } from "@/lib/intelligence/recommendation/ranker-v3";
import type { Anime } from "@/lib/types";

type HomePoolContext = {
  pool: Anime[];
  surprise: Anime[];
  entries: ReturnType<typeof useWatchlist>["entries"];
  ready: boolean;
  personalised: boolean;
};

const HomePoolCtx = createContext<HomePoolContext | null>(null);

function unique(list: Anime[]) {
  const seen = new Set<number>();
  return list.filter((a) => {
    if (!a?.id || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export function HomePersonalizedProvider({ children, initial, limit = 180 }: { children: React.ReactNode; initial: Anime[]; limit?: number }) {
  const { entries, ready } = useWatchlist();
  const [rawPool, setRawPool] = useState<Anime[]>(initial);
  const [rawSurprise, setRawSurprise] = useState<Anime[]>([]);
  const [intelligenceRevision, setIntelligenceRevision] = useState(0);

  useEffect(() => { setRawPool(initial); }, [initial]);

  // AI commands never create a second recommender. They only update the
  // existing session controls, then bump this revision so the canonical
  // recommendation pipeline reruns with those controls.
  useEffect(() => onNexusSignal((signal) => {
    if (signal.source !== "ai" || !claimNexusCommand(signal.id, "recommendations")) return;
    if (signal.type === "filter") {
      const slug = signal.payload.experienceSlug;
      if (typeof slug === "string" && slug.trim()) {
        writeIntentSession({ slug: slug.trim() });
      }
      const session = signal.payload.session;
      if (session && typeof session === "object") {
        const s = session as Record<string, unknown>;
        const patch: Parameters<typeof writeIntentSession>[0] = {};
        if (s.intensity === "light" || s.intensity === "moderate" || s.intensity === "maximum") {
          patch.intensity = s.intensity;
        }
        if (s.energy === "low" || s.energy === "medium" || s.energy === "high") {
          patch.energy = s.energy;
        }
        if (s.attention === "easy" || s.attention === "medium" || s.attention === "demanding") {
          patch.attention = s.attention;
        }
        if (Object.keys(patch).length) writeIntentSession(patch);
      }
    }
    setIntelligenceRevision((value) => value + 1);
  }), []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const base = { entries: entries.slice(0, 200), maxPool: Math.max(limit, 160), perSource: 36 };
    Promise.all([
      fetch("/api/recommend/pool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...base, experienceSlug: readIntentSession().slug || undefined }) }).then((r) => r.json()),
      fetch("/api/recommend/pool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...base, experienceSlug: "surprise" }) }).then((r) => r.json()),
    ]).then(([normal, surprise]) => {
      if (cancelled) return;
      if (Array.isArray(normal?.data) && normal.data.length) setRawPool(normal.data as Anime[]);
      if (Array.isArray(surprise?.data) && surprise.data.length) setRawSurprise(surprise.data as Anime[]);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [entries, ready, limit, intelligenceRevision]);

  const pool = useMemo(() => {
    const base = unique(rawPool);
    if (!ready || entries.length === 0) return base;
    return rankRecommendationsV3(base, entries, {
      experienceSlug: readIntentSession().slug || undefined,
      excludeIds: new Set(entries.map((e) => e.id)),
    }).map((r) => r.anime);
  }, [rawPool, entries, ready, intelligenceRevision]);

  const surprise = useMemo(() => {
    const base = unique(rawSurprise.length ? rawSurprise : rawPool);
    if (!ready || entries.length === 0) return base;
    return rankRecommendationsV3(base, entries, {
      experienceSlug: "surprise",
      excludeIds: new Set(entries.map((e) => e.id)),
    }).map((r) => r.anime);
  }, [rawSurprise, rawPool, entries, ready]);

  const value = useMemo(() => ({
    pool: unique(pool),
    surprise: unique(surprise),
    entries,
    ready,
    personalised: ready && entries.length > 0,
  }), [pool, surprise, entries, ready]);

  return <HomePoolCtx.Provider value={value}>{children}</HomePoolCtx.Provider>;
}

export function useHomePersonalizedPool(fallback: Anime[] = [], _limit = 120) {
  const ctx = useContext(HomePoolCtx);
  if (ctx) return ctx;
  return { pool: fallback, surprise: fallback, entries: [], ready: false, personalised: false };
}
