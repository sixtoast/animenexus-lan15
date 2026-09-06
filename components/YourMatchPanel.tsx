"use client";

import { useMemo } from "react";
import type { Anime } from "@/lib/types";
import { useWatchlist } from "@/components/WatchlistProvider";
import { computeYourMatch } from "@/lib/your-match";
import { useSessionRevision } from "@/lib/use-session-revision";

type Props = {
  anime: Anime;
};

/** Detail “Your Match” — local preference reasons, soft-fail when shelf is thin. */
export function YourMatchPanel({ anime }: Props) {
  const { entries, ready } = useWatchlist();
  const rev = useSessionRevision();

  const match = useMemo(
    () => (ready ? computeYourMatch(anime, entries) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, entries, anime.id, rev],
  );

  if (!ready || !match) return null;

  const pct = Math.round(match.score * 100);

  return (
    <section className="detail-section your-match" aria-label="Your match">
      <div className="your-match-head">
        <h2>Your match</h2>
        <span className={"your-match-badge your-match-" + match.confidence}>
          {match.confidenceLabel}
        </span>
      </div>
      <div className="your-match-meter" aria-hidden>
        <div
          className="your-match-meter-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="your-match-score meta" aria-live="polite">
        {pct}% alignment with your shelf
        {match.activeCluster ? ` · mode “${match.activeCluster}”` : ""}
      </p>
      {match.reasons.length > 0 ? (
        <ul className="your-match-reasons">
          {match.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : (
        <p className="meta">
          Not enough signal for reasons yet — keep sealing and scoring.
        </p>
      )}
      <p className="your-match-note">
        Local preference only. Not a rating of the show’s quality.
      </p>
    </section>
  );
}
