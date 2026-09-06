"use client";

import { useMemo } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { buildTasteForecast } from "@/lib/taste-forecast";

/**
 * Taste Forecast panel — drift, contradictions, fatigue (soft).
 */
export function TasteForecast() {
  const { entries, ready } = useWatchlist();

  const forecast = useMemo(
    () => (ready ? buildTasteForecast(entries) : null),
    [ready, entries],
  );

  if (!ready || !forecast || forecast.lines.length === 0) return null;

  return (
    <section
      className="taste-section taste-forecast"
      aria-label="Taste forecast"
    >
      <h2>Taste forecast</h2>
      {forecast.headline ? (
        <p className="taste-forecast-headline">{forecast.headline}</p>
      ) : null}
      <ul className="taste-forecast-list">
        {forecast.lines.map((line) => (
          <li
            key={line.title + line.kind}
            className={"taste-forecast-item taste-forecast-" + line.kind}
          >
            <div className="taste-forecast-title">{line.title}</div>
            <p className="taste-forecast-body">{line.body}</p>
          </li>
        ))}
      </ul>
      <p className="taste-forecast-note">
        Forecasts need repeated evidence. They stay local and can be wrong —
        your next few watches matter more than this card.
      </p>
    </section>
  );
}
