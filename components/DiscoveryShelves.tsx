"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { underratedForYou, blindSpotPicks } from "@/lib/discovery-shelves";
import type { Anime } from "@/lib/types";
import { readIntentSession } from "@/lib/intent-session";

type Props = {
  candidates: Anime[];
};

/**
 * Home discovery shelves — ranks from SSR pool, then upgrades to
 * personalised multi-source pool when shelf is ready (R4).
 */
export function DiscoveryShelves({ candidates }: Props) {
  const { entries, ready } = useWatchlist();
  const [pool, setPool] = useState<Anime[]>(candidates);

  useEffect(() => {
    setPool(candidates);
  }, [candidates]);

  useEffect(() => {
    if (!ready || entries.length < 2) return;
    let cancelled = false;
    const slug = readIntentSession().slug;
    void fetch("/api/recommend/pool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: entries.slice(0, 120),
        experienceSlug: slug || undefined,
        maxPool: 240,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const data = (j.data || []) as Anime[];
        if (data.length >= 24) setPool(data);
      })
      .catch(() => {
        /* soft — keep SSR candidates */
      });
    return () => {
      cancelled = true;
    };
  }, [ready, entries]);

  const under = useMemo(() => {
    if (!ready || entries.length < 2) return [];
    return underratedForYou(pool, entries, 6);
  }, [ready, entries, pool]);

  const blind = useMemo(() => {
    if (!ready || entries.length < 2)
      return { tags: [] as string[], items: [] as Anime[] };
    return blindSpotPicks(pool, entries, 6);
  }, [ready, entries, pool]);

  if (!ready || entries.length < 2) return null;
  if (!under.length && !blind.items.length) return null;

  return (
    <div className="discovery-shelves">
      {under.length > 0 ? (
        <section className="home-rail-section">
          <div className="home-rail-head">
            <h2>Underrated for you</h2>
            <span className="home-rail-note">High fit · quieter popularity</span>
          </div>
          <div className="home-rail">
            {under.map((a) => (
              <Link key={a.id} href={`/anime/${a.id}`} className="home-rail-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt="" />
                <div className="hrc-body">
                  <div className="hrc-title">{a.title}</div>
                  <div className="hrc-meta">{a.tags?.slice(0, 2).join(" · ")}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {blind.items.length > 0 ? (
        <section className="home-rail-section">
          <div className="home-rail-head">
            <h2>Blind spots</h2>
            <span className="home-rail-note">
              Adjacent · {blind.tags.join(", ") || "explore"}
            </span>
          </div>
          <div className="home-rail">
            {blind.items.map((a) => (
              <Link key={a.id} href={`/anime/${a.id}`} className="home-rail-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt="" />
                <div className="hrc-body">
                  <div className="hrc-title">{a.title}</div>
                  <div className="hrc-meta">{a.tags?.slice(0, 2).join(" · ")}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
