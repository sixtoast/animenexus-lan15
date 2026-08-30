"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { underratedForYou, blindSpotPicks } from "@/lib/discovery-shelves";
import type { Anime } from "@/lib/types";

type Props = {
  candidates: Anime[];
};

export function DiscoveryShelves({ candidates }: Props) {
  const { entries, ready } = useWatchlist();

  const under = useMemo(() => {
    if (!ready || entries.length < 2) return [];
    return underratedForYou(candidates, entries, 6);
  }, [ready, entries, candidates]);

  const blind = useMemo(() => {
    if (!ready || entries.length < 2) return { tags: [] as string[], items: [] as Anime[] };
    return blindSpotPicks(candidates, entries, 6);
  }, [ready, entries, candidates]);

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
