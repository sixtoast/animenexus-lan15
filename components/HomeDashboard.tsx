"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { touchStreak, readStreak } from "@/lib/streak";
import { readMemory, type RecentView } from "@/lib/lantern-memory";
import { useToast } from "@/components/ToastProvider";
import type { Anime } from "@/lib/types";

type Props = {
  /** Optional; home page uses the full trending grid instead */
  trending?: Anime[];
};

export function HomeDashboard({ trending = [] }: Props) {
  const { entries, ready } = useWatchlist();
  const { showToast } = useToast();
  const [streak, setStreak] = useState(0);
  const [recent, setRecent] = useState<RecentView[]>([]);

  useEffect(() => {
    const { state, milestone } = touchStreak();
    setStreak(state.count);
    if (milestone) {
      showToast(`${state.count}-day listening streak`, "🎧", true);
    } else {
      setStreak(readStreak().count);
    }
    setRecent(readMemory().recentViews.slice(0, 10));
  }, [showToast]);

  useEffect(() => {
    const refresh = () => setRecent(readMemory().recentViews.slice(0, 10));
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const continueList = useMemo(() => {
    return entries
      .filter(
        (e) =>
          e.watchStatus === "watching" ||
          (e.watchStatus === "paused" && e.progress > 0),
      )
      .slice(0, 12);
  }, [entries]);

  const counts = useMemo(() => {
    const c = { watching: 0, planning: 0, completed: 0 };
    for (const e of entries) {
      if (e.watchStatus in c) c[e.watchStatus as keyof typeof c]++;
    }
    return c;
  }, [entries]);

  const continueIds = useMemo(
    () => new Set(continueList.map((e) => e.id)),
    [continueList],
  );
  const signalRecent = recent.filter((r) => !continueIds.has(r.id));

  return (
    <div className="home-dash">
      <div className="home-stat-chips">
        <div className="home-chip">
          <strong>{ready ? counts.watching : "—"}</strong>
          <span>Watching</span>
        </div>
        <div className="home-chip">
          <strong>{ready ? counts.planning : "—"}</strong>
          <span>Planning</span>
        </div>
        <div className="home-chip">
          <strong>{ready ? counts.completed : "—"}</strong>
          <span>Done</span>
        </div>
        <div className="home-chip accent">
          <strong>{streak}</strong>
          <span>Streak</span>
        </div>
      </div>

      {continueList.length > 0 ? (
        <section className="home-rail-section">
          <div className="home-rail-head">
            <h2>Continue</h2>
            <Link href="/watchlist">Watchlist →</Link>
          </div>
          <div className="home-rail">
            {continueList.map((e) => (
              <Link
                key={e.id}
                href={`/anime/${e.id}`}
                className="home-rail-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.image} alt="" />
                <div className="hrc-body">
                  <div className="hrc-title">{e.title}</div>
                  <div className="hrc-meta">
                    Ep {e.progress}
                    {e.episodes ? ` / ${e.episodes}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {signalRecent.length > 0 ? (
        <section className="home-rail-section home-signals">
          <div className="home-rail-head">
            <h2>Recent signals</h2>
            <span className="home-rail-note">Remembered</span>
          </div>
          <div className="home-rail">
            {signalRecent.map((r) => (
              <Link
                key={r.id}
                href={`/anime/${r.id}`}
                className="home-rail-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    r.image ||
                    "https://placehold.co/120x170/1a1a1a/555?text=?"
                  }
                  alt=""
                />
                <div className="hrc-body">
                  <div className="hrc-title">{r.title}</div>
                  <div className="hrc-meta">Opened</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {trending.length > 0 ? (
        <section className="home-rail-section">
          <div className="home-rail-head">
            <h2>Trending</h2>
            <Link href="/browse">See all →</Link>
          </div>
          <div className="home-rail">
            {trending.slice(0, 12).map((a) => (
              <Link
                key={a.id}
                href={`/anime/${a.id}`}
                className="home-rail-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt="" />
                <div className="hrc-body">
                  <div className="hrc-title">{a.title}</div>
                  <div className="hrc-meta">
                    {a.score ? `★ ${a.score.toFixed(1)}` : a.format}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {ready &&
      continueList.length === 0 &&
      signalRecent.length === 0 &&
      trending.length === 0 ? (
        <p className="home-dash-empty">
          Open a few titles or seal one to your list — this desk fills as you
          explore.
        </p>
      ) : null}
    </div>
  );
}
