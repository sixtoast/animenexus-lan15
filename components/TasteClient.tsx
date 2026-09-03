"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { TasteExtras } from "@/components/TasteExtras";
import { SignalBars } from "@/components/ui/SignalBars";
import { SignalEmpty } from "@/components/SignalEmpty";
import { CountTick } from "@/components/ui/CountTick";
import { computeTaste, statusLabel } from "@/lib/taste";
import { readMemory } from "@/lib/lantern-memory";
import { buildTasteStory } from "@/lib/taste-story";
import {
  userResonance,
  describeUserResonance,
  topResonanceDims,
  resonanceLabel,
} from "@/lib/resonance";
import type { WatchStatus } from "@/lib/types";

const STATUS_ORDER: WatchStatus[] = [
  "watching",
  "planning",
  "completed",
  "paused",
  "dropped",
  "repeating",
];

export function TasteClient() {
  const { entries, ready } = useWatchlist();

  const story = useMemo(() => {
    if (!ready) return null;
    return buildTasteStory(entries);
  }, [ready, entries]);

  if (!ready) {
    return (
      <div className="state-box">
        <SignalBars level={3} animated />
        <p style={{ marginTop: 12 }}>Lantern is reading your shelf…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <SignalEmpty
        kind="shelf"
        className="lantern-empty"
        title="No portrait yet"
        body="Taste fills from this browser’s watchlist. Seal a few titles, mark progress, and Lantern will describe how you watch — not only what."
        action={{ label: "Browse catalog", href: "/browse" }}
        secondary={{ label: "Daily signal", href: "/daily" }}
      />
    );
  }

  const s = computeTaste(entries);
  const user = userResonance(entries);
  const dims = topResonanceDims(user, 6);
  const maxDim = Math.max(...dims.map((d) => d.value), 0.01);
  const memory = readMemory();

  return (
    <div className="taste-page">
      {story ? (
        <section className="taste-portrait" aria-labelledby="taste-story-title">
          <p className="taste-portrait-kicker">Taste story</p>
          <h2 id="taste-story-title" className="taste-portrait-title">
            {story.headline}
          </h2>
          <p className="taste-portrait-body">{story.body}</p>
          {story.bullets?.length ? (
            <ul className="taste-story-bullets">
              {story.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="taste-portrait" style={{ marginTop: 20 }}>
        <p className="taste-portrait-kicker">How you watch</p>
        <h2 className="taste-portrait-title">{describeUserResonance(user)}</h2>
        <p className="taste-portrait-body">
          Soft resonance from sealed titles — relative bars, not a scoreboard.
        </p>
        {dims.length > 0 ? (
          <div className="stats-bar-container" style={{ marginTop: 16 }}>
            {dims.map(({ dim, value }) => (
              <div key={dim} className="stats-bar-row">
                <div className="bar-label">{resonanceLabel(dim)}</div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(value / maxDim) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="stats-grid" style={{ marginTop: 24 }}>
        <div className="stats-card">
          <div className="stat-number">
            <CountTick value={s.total} />
          </div>
          <div className="stat-label">On shelf</div>
        </div>
        <div className="stats-card">
          <div className="stat-number">
            <CountTick value={s.byStatus.watching || 0} />
          </div>
          <div className="stat-label">Watching</div>
        </div>
        <div className="stats-card">
          <div className="stat-number">
            <CountTick value={s.byStatus.completed || 0} />
          </div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stats-card">
          <div className="stat-number">
            <CountTick value={s.byStatus.planning || 0} />
          </div>
          <div className="stat-label">Planning</div>
        </div>
      </div>

      <TasteExtras entries={entries} memory={memory} />

      <p className="taste-footnote" style={{ marginTop: 28 }}>
        Counts and resonance stay on this device. Sync AniList from Account when
        you want cloud list alignment.
      </p>
    </div>
  );
}
