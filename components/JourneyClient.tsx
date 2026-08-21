"use client";

/**
 * Journey / Archive (Sprint 30 + Awwwards Memory Room data).
 * Timeline remains the default; chapters + importance prepare spatial mode.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { journeyInsights } from "@/lib/journey";
import { dismissInsight } from "@/lib/lantern-insights";
import { readMemory } from "@/lib/lantern-memory";
import { buildTasteStory } from "@/lib/taste-story";
import { buildMemoryRoom } from "@/lib/memory-room";

const KIND_LABEL: Record<string, string> = {
  first_seen: "Origin",
  first_seal: "Seal",
  completion: "Close",
  genre_shift: "Genre",
  rec_accept: "Rec",
  tool: "Tool",
  visit_streak: "Visits",
  taste_chapter: "Taste",
  session: "Session",
  observation: "Note",
};

export function JourneyClient() {
  const { entries, ready } = useWatchlist();
  const [tick, setTick] = useState(0);

  const { events, chapters, insights, storyHeadline } = useMemo(() => {
    if (!ready || typeof window === "undefined") {
      return {
        events: [],
        chapters: [],
        insights: [],
        storyHeadline: "",
      };
    }
    const m = readMemory();
    void tick;
    const room = buildMemoryRoom(entries, m);
    return {
      events: room.events,
      chapters: room.chapters,
      insights: journeyInsights(entries, m),
      storyHeadline: buildTasteStory(entries, m).headline,
    };
  }, [entries, ready, tick]);

  if (!ready) {
    return (
      <div className="state-box">
        <div className="spinner" />
        <p>Opening the journey…</p>
      </div>
    );
  }

  return (
    <div className="journey">
      {storyHeadline ? (
        <p className="journey-headline" role="status">
          {storyHeadline}{" "}
          <Link href="/taste">Taste story →</Link>
        </p>
      ) : null}

      <section className="journey-section">
        <div className="home-rail-head">
          <h2>Lantern insights</h2>
          <span className="home-rail-note">Shared · local</span>
        </div>
        <p className="tools-hint">
          Same evidence engine as Home — dismissible, never sent off-browser.
        </p>
        {insights.length === 0 ? (
          <p className="tools-hint">
            No insights yet. Seal and finish a few titles to give Lantern
            evidence.
          </p>
        ) : (
          <ul className="insight-list">
            {insights.map((ins) => (
              <li key={ins.id} className="insight-card">
                <p className="insight-text">{ins.text}</p>
                <details className="insight-evidence">
                  <summary>
                    Evidence · {ins.confidenceLabel} confidence
                  </summary>
                  <ul>
                    {ins.evidence.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </details>
                <button
                  type="button"
                  className="insight-dismiss"
                  onClick={() => {
                    dismissInsight(ins.id);
                    setTick((t) => t + 1);
                  }}
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {chapters.length > 0 ? (
        <section className="journey-section" aria-label="Memory chapters">
          <div className="home-rail-head">
            <h2>Archive chapters</h2>
            <span className="home-rail-note">From your history</span>
          </div>
          <p className="tools-hint">
            Significance within your AnimeNexus history — not a claim about life
            importance.
          </p>
          <ul className="memory-chapters">
            {chapters.map((ch) => (
              <li key={ch.id} className="memory-chapter-card">
                <h3 className="nx-kicker">{ch.title}</h3>
                <p>{ch.summary}</p>
                <span className="home-rail-note">
                  {ch.eventIds.length} moment
                  {ch.eventIds.length === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="journey-section">
        <div className="home-rail-head">
          <h2>Timeline</h2>
          <span className="home-rail-note">Meaningful moments</span>
        </div>
        <p className="tools-hint">
          First light, seals, completions, taste chapters, rec learning — not
          every click.
        </p>
        {events.length === 0 ? (
          <div className="state-box">
            <p>No milestones yet. Browse, seal, and complete to fill this path.</p>
            <Link href="/browse" className="btn btn-accent btn-sm">
              Browse →
            </Link>
          </div>
        ) : (
          <ol className="journey-timeline">
            {events.map((e) => (
              <li
                key={e.id}
                className="journey-event"
                data-kind={e.kind}
                data-importance={e.importance.toFixed(2)}
                data-chapter={e.chapter}
                style={{
                  opacity: 0.55 + e.importance * 0.45,
                }}
              >
                <span className="journey-kind">
                  {KIND_LABEL[e.kind] || e.kind}
                </span>
                <div className="journey-event-body">
                  {e.href ? (
                    <Link href={e.href} className="journey-event-title">
                      {e.title}
                    </Link>
                  ) : (
                    <span className="journey-event-title">{e.title}</span>
                  )}
                  <time className="journey-event-date" dateTime={e.at}>
                    {e.at.slice(0, 10)}
                  </time>
                  <p className="journey-event-text">{e.body}</p>
                  {e.resonanceNote ? (
                    <p className="tools-hint">{e.resonanceNote}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
