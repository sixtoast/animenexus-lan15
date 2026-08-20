"use client";

/**
 * Lantern Insights panel (Sprint 27).
 * Evidence + confidence + dismiss — no opaque claims.
 */

import { useEffect, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  buildLanternInsights,
  dismissInsight,
  type LanternInsight,
} from "@/lib/lantern-insights";

export function LanternInsights() {
  const { entries, ready } = useWatchlist();
  const [insights, setInsights] = useState<LanternInsight[]>([]);

  useEffect(() => {
    if (!ready) return;
    setInsights(buildLanternInsights(entries, { limit: 3 }));
  }, [ready, entries]);

  if (!ready || !insights.length) return null;

  function onDismiss(id: string) {
    dismissInsight(id);
    setInsights((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <section className="lantern-insights" aria-label="Lantern insights">
      <div className="home-rail-head">
        <h2>Lantern insights</h2>
        <span className="home-rail-note">Evidence · local</span>
      </div>
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
              onClick={() => onDismiss(ins.id)}
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
