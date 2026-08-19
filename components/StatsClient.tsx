"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { computeWatchlistStats } from "@/lib/stats";
import {
  describeUserResonance,
  resonanceLabel,
  topResonanceDims,
  userResonance,
} from "@/lib/resonance";
import { emitNexus } from "@/lib/nexus";

export function StatsClient() {
  const { entries, ready } = useWatchlist();
  const s = useMemo(() => computeWatchlistStats(entries), [entries]);
  const user = useMemo(() => userResonance(entries), [entries]);
  const dims = useMemo(() => topResonanceDims(user, 6), [user]);
  const maxDim = Math.max(...dims.map((d) => d.value), 0.01);
  const maxGenre = Math.max(...s.topGenres.map(([, n]) => n), 1);
  const topGenre = s.topGenres[0]?.[0];
  const watching = s.byStatus.watching;
  const completed = s.byStatus.completed;
  const portraitLine = [
    s.total >= 40 ? "Heavy shelf" : s.total >= 15 ? "Solid shelf" : "Early shelf",
    watching > completed ? "more in progress" : "finisher lean",
    topGenre ? `${topGenre} signal` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    emitNexus({ type: "tool_opened", tool: "stats" });
  }, []);

  if (!ready) {
    return (
      <div className="state-box">
        <div className="spinner" />
      </div>
    );
  }

  if (s.total === 0) {
    return (
      <div className="state-box">
        <p>No list data yet.</p>
        <Link href="/browse" className="btn btn-accent btn-sm">
          Browse →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="taste-portrait stats-portrait">
        <p className="taste-portrait-kicker">Stats portrait</p>
        <h2 className="taste-portrait-title">{portraitLine}</h2>
        <p className="taste-portrait-body">
          {s.hours} estimated hours · {s.total} titles
          {s.meanRating ? ` · mean score ${s.meanRating.toFixed(1)}` : ""}
          {topGenre ? ` · strongest genre ${topGenre}` : ""}
        </p>
        {entries.length >= 2 ? (
          <p className="taste-portrait-body" style={{ marginTop: 8 }}>
            {describeUserResonance(user)}
          </p>
        ) : null}
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="stat-number">{s.total}</div>
          <div className="stat-label">Titles tracked</div>
        </div>
        <div className="stats-card">
          <div className="stat-number">{watching}</div>
          <div className="stat-label">Watching</div>
        </div>
        <div className="stats-card">
          <div className="stat-number">{completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stats-card">
          <div className="stat-number">{s.hours}</div>
          <div className="stat-label">Est. hours</div>
        </div>
        <div className="stats-card">
          <div className="stat-number">
            {s.meanRating ? s.meanRating.toFixed(1) : "—"}
          </div>
          <div className="stat-label">Mean rating ({s.rated})</div>
        </div>
        <div className="stats-card">
          <div className="stat-number">{s.byStatus.planning}</div>
          <div className="stat-label">Planning</div>
        </div>
      </div>

      {dims.length > 0 ? (
        <section className="taste-section" style={{ marginTop: 28 }}>
          <h2>Resonance dimensions</h2>
          <p className="tools-hint" role="status" aria-live="polite">
            Soft profile from sealed titles — relative bars, not percentages of
            truth.
          </p>
          <div className="stats-bar-container">
            {dims.map(({ dim, value }) => (
              <div key={dim} className="stats-bar-row">
                <div className="bar-label">{resonanceLabel(dim)}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(value / maxDim) * 100}%` }}
                  />
                </div>
                <div className="bar-value" aria-hidden>
                  ·
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="taste-section" style={{ marginTop: 28 }}>
        <h2>Score distribution</h2>
        <div className="stats-bar-container">
          {Object.entries(s.scoreBuckets).map(([label, n]) => (
            <div key={label} className="stats-bar-row">
              <div className="bar-label">{label}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${s.rated ? (n / s.rated) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="bar-value">{n}</div>
            </div>
          ))}
        </div>
      </section>

      {s.topGenres.length > 0 ? (
        <section className="taste-section">
          <h2>Top genres</h2>
          <div className="stats-bar-container">
            {s.topGenres.map(([g, n]) => (
              <div key={g} className="stats-bar-row">
                <div className="bar-label">{g}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(n / maxGenre) * 100}%` }}
                  />
                </div>
                <div className="bar-value">{n}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
