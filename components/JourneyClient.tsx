"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { buildInsights, buildJourney } from "@/lib/journey";
import { readMemory } from "@/lib/lantern-memory";

export function JourneyClient() {
  const { entries, ready } = useWatchlist();

  const { events, insights } = useMemo(() => {
    if (!ready || typeof window === "undefined") {
      return { events: [], insights: [] };
    }
    const m = readMemory();
    return {
      events: buildJourney(entries, m),
      insights: buildInsights(entries, m),
    };
  }, [entries, ready]);

  if (!ready) {
    return (
      <div className="state-box">
        <div className="spinner" />
        <p>Opening the journey…</p>
      </div>
    );
  }

  return (
    <div>
      <section className="taste-section">
        <h2>Lantern insights</h2>
        <p className="tools-hint" role="status" aria-live="polite">
          Soft observations from on-device memory — dismiss by exploring elsewhere;
          nothing is sent off-browser.
        </p>
        {insights.length === 0 ? (
          <p className="tools-hint">No insights yet.</p>
        ) : (
          <ul className="taste-list">
            {insights.map((i) => (
              <li key={i.id}>
                {i.href ? (
                  <Link href={i.href} className="taste-list-link">
                    <span className="taste-list-title">{i.text}</span>
                    <span className="taste-list-meta">{i.confidence}</span>
                  </Link>
                ) : (
                  <div className="taste-list-link">
                    <span className="taste-list-title">{i.text}</span>
                    <span className="taste-list-meta">{i.confidence}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="taste-section">
        <h2>Timeline</h2>
        <p className="tools-hint">
          Meaningful moments only — first light, seals, completions, signals.
        </p>
        {events.length === 0 ? (
          <div className="state-box">
            <p>No milestones yet. Browse, seal, and complete to fill this path.</p>
            <Link href="/browse" className="btn btn-accent btn-sm">
              Browse →
            </Link>
          </div>
        ) : (
          <ol className="taste-list" style={{ listStyle: "none", padding: 0 }}>
            {events.map((e) => (
              <li key={e.id} style={{ marginBottom: 14 }}>
                {e.href ? (
                  <Link href={e.href} className="taste-list-link">
                    <span className="taste-list-title">{e.title}</span>
                    <span className="taste-list-meta">
                      {e.at.slice(0, 10)}
                    </span>
                  </Link>
                ) : (
                  <div className="taste-list-link">
                    <span className="taste-list-title">{e.title}</span>
                    <span className="taste-list-meta">
                      {e.at.slice(0, 10)}
                    </span>
                  </div>
                )}
                <p className="tools-hint" style={{ marginTop: 4, marginLeft: 4 }}>
                  {e.body}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
