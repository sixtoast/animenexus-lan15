"use client";

import { SignalEmpty } from "@/components/SignalEmpty";

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

function episodeCount(e: WatchlistEntry): number {
  const n =
    typeof e.episodes === "number"
      ? e.episodes
      : parseInt(String(e.episodes || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

function scoreWatching(e: WatchlistEntry, user: ReturnType<typeof userResonance>) {
  const w = interactionWeight(e);
  const sim = cosineSimilarity(user, resonanceFromGenres(e.genres));
  const progressHint = Math.min(1, (e.progress || 0) / episodeCount(e));
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
      <SignalEmpty
        kind="shelf"
        title="Nothing to complete yet"
        body="Seal titles to your shelf, mark a few as Watching or Planning, and this queue fills with soft ranks."
        action={{ label: "Browse catalog →", href: "/browse" }}
        secondary={{ label: "Open watchlist", href: "/watchlist" }}
      />
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
          <SignalEmpty
            kind="shelf"
            title="No active Watching titles"
            body="Move something from Planning into Watching, or seal a new title and set progress."
            action={{ label: "Open watchlist", href: "/watchlist" }}
            secondary={{ label: "Browse", href: "/browse" }}
          />
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
          <SignalEmpty
            kind="shelf"
            title="Planning queue is quiet"
            body="Add titles as Planning or Paused and they’ll rank here by resonance and engagement."
            action={{ label: "Browse catalog", href: "/browse" }}
          />
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
