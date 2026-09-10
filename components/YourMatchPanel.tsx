"use client";

import { useMemo } from "react";
import type { Anime } from "@/lib/types";
import { useWatchlist } from "@/components/WatchlistProvider";
import { computeYourMatch } from "@/lib/your-match";
import { useSessionRevision } from "@/lib/use-session-revision";

type Props = {
  anime: Anime;
};

/**
 * Detail "Your Match" — confidence + strong signals + friction.
 * Does not display uncalibrated percentages.
 */
export function YourMatchPanel({ anime }: Props) {
  const { entries, ready } = useWatchlist();
  const rev = useSessionRevision();

  const match = useMemo(
    () => (ready ? computeYourMatch(anime, entries) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, entries, anime.id, rev],
  );

  if (!ready || !match) return null;

  const meter =
    match.confidence === "strong"
      ? 88
      : match.confidence === "good"
        ? 68
        : match.confidence === "soft"
          ? 48
          : 32;

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
          style={{ width: `${meter}%` }}
        />
      </div>
      <p className="your-match-score meta" aria-live="polite">
        Lantern confidence \u00b7 {match.confidenceLabel}
        {match.explorationLevel
          ? ` \u00b7 ${match.explorationLevel}`
          : match.activeCluster
            ? ` \u00b7 "${match.activeCluster}"`
            : ""}
      </p>

      {match.strongSignals && match.strongSignals.length > 0 ? (
        <div className="your-match-signals">
          <h3 className="your-match-sub">Strong signals</h3>
          <ul className="your-match-reasons">
            {match.strongSignals.map((s) => (
              <li key={s.key}>{s.label}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.frictionSignals && match.frictionSignals.length > 0 ? (
        <div className="your-match-friction">
          <h3 className="your-match-sub">Potential friction</h3>
          <ul className="your-match-reasons">
            {match.frictionSignals.map((f) => (
              <li key={f.messageKey || f.type}>{f.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.reasons.length > 0 ? (
        <ul className="your-match-reasons">
          {match.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : !match.strongSignals?.length ? (
        <p className="meta">
          Not enough signal for reasons yet — keep sealing and scoring.
        </p>
      ) : null}

      <p className="your-match-note">
        Local preference only. Not a rating of the show’s quality.
      </p>
    </section>
  );
}
