"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import type { WatchlistEntry } from "@/lib/types";
import {
  cosineSimilarity,
  interactionWeight,
  resonanceFromGenres,
  userResonance,
} from "@/lib/resonance";

function scoreWatching(e: WatchlistEntry, user: ReturnType<typeof userResonance>) {
  const w = interactionWeight(e);
  const sim = cosineSimilarity(user, resonanceFromGenres(e.genres));
  // Prefer near-complete + aligned with shelf
  const progressHint = Math.min(1, (e.progress || 0) / Math.max(1, e.episodes || 12));
  return 0.35 * w + 0.35 * sim + 0.3 * progressHint;
}

function scoreQueue(e: WatchlistEntry, user: ReturnType<typeof userResonance>) {
  const w = interactionWeight(e);
  const sim = cosineSimilarity(user, resonanceFromGenres(e.genres));
  const community =
    e.score && e.score > 0
      ? e.score > 10
        ? e.score / 100
        : e.score / 10
      : 0.45;
  return 0.4 * w + 0.4 * sim + 0.2 * community;
}

export function CompletionistClient() {
  const { entries, ready } = useWatchlist();

  const user = useMemo(() => userResonance(entries), [entries]);

  const watching = useMemo(() => {
    return entries
      .filter((e) => e.watchStatus === "watching")
      .map((e) => ({ e, s: scoreWatching(e, user) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.e);
  }, [entries, user]);

  const queue = useMemo(() => {
    return entries
      .filter((e) => e.watchStatus === "planning" || e.watchStatus === "paused")
      .map((e) => ({ e, s: scoreQueue(e, user) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.e);
  }, [entries, user]);

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
        <p className="tools-hint" role="status" aria-live="polite">
          Ordered by progress, engagement, and shelf resonance — soft ranks.
        </p>
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
        <h2>Planning queue</h2>
        <p className="tools-hint" role="status" aria-live="polite">
          Ranked by resonance + engagement + community score — not a rigid order.
        </p>
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
