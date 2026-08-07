"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";

export function CompletionistClient() {
  const { entries, ready } = useWatchlist();

  const queue = useMemo(() => {
    return entries
      .filter((e) => e.watchStatus === "planning" || e.watchStatus === "paused")
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [entries]);

  const watching = useMemo(
    () =>
      entries
        .filter((e) => e.watchStatus === "watching")
        .sort((a, b) => b.progress - a.progress),
    [entries],
  );

  if (!ready) {
    return (
      <div className="state-box">
        <div className="spinner" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="state-box">
        <p>Empty list — nothing to complete yet.</p>
        <Link href="/browse" className="btn btn-accent btn-sm">
          Browse →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className="taste-section">
        <h2>Finish these first</h2>
        {watching.length === 0 ? (
          <p className="tools-hint">No active Watching titles.</p>
        ) : (
          <ul className="taste-list">
            {watching.map((e) => (
              <li key={e.id}>
                <Link href={`/anime/${e.id}`} className="taste-list-link">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.image} alt="" />
                  <span className="taste-list-title">{e.title}</span>
                  <span className="taste-list-meta">ep {e.progress}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="taste-section">
        <h2>Planning queue (by community score)</h2>
        {queue.length === 0 ? (
          <p className="tools-hint">Planning / Paused is empty.</p>
        ) : (
          <ul className="taste-list">
            {queue.map((e, i) => (
              <li key={e.id}>
                <Link href={`/anime/${e.id}`} className="taste-list-link">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.image} alt="" />
                  <span className="taste-list-title">
                    #{i + 1} {e.title}
                  </span>
                  <span className="taste-list-score">
                    {e.score ? e.score.toFixed(1) : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
