"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { buildWatchlistQueue } from "@/lib/watchlist-queue";

export function WatchlistQueue() {
  const { entries, ready } = useWatchlist();

  const queue = useMemo(() => {
    if (!ready || entries.length < 1) return [];
    return buildWatchlistQueue(entries, 8);
  }, [ready, entries]);

  if (!ready || !queue.length) return null;

  return (
    <section className="wl-queue" aria-label="Living queue">
      <div className="home-rail-head" style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Living queue</h2>
        <span className="home-rail-note">Next-up · resume · stale plans</span>
      </div>
      <div className="wl-queue-list">
        {queue.map((q) => (
          <Link
            key={`${q.kind}-${q.entry.id}`}
            href={`/anime/${q.entry.id}`}
            className={`wl-queue-card wl-queue-card--${q.kind}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.entry.image} alt="" />
            <div className="wl-queue-body">
              <div className="wl-queue-kind">
                {q.kind === "resume"
                  ? "Resume"
                  : q.kind === "stale_planning"
                    ? "Stale plan"
                    : "Next up"}
              </div>
              <div className="wl-queue-title">{q.entry.title}</div>
              <div className="wl-queue-reason">{q.reason}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
