"use client";

/**
 * “Why this is here” (Sprint 25).
 * Shows coarse confidence + evidence from rankRecommendations — never fake precision.
 */

import {
  confidenceCopy,
  type RankedRecommendation,
} from "@/lib/recommend-rank";

type Props = {
  ranked: RankedRecommendation;
  /** Compact one-line for rails; full expands details */
  compact?: boolean;
  className?: string;
};

export function WhyThisIsHere({ ranked, compact = false, className }: Props) {
  const head = confidenceCopy(ranked.confidence);
  const reasons = ranked.reasons.filter(Boolean);

  if (compact) {
    return (
      <span className={className || "why-here why-here--compact"}>
        <span className="why-here-head">{head}</span>
        {reasons[0] ? (
          <span className="why-here-snip"> · {reasons[0]}</span>
        ) : null}
      </span>
    );
  }

  return (
    <details className={className || "why-here"}>
      <summary>
        Why Lantern chose this · <span className="why-here-head">{head}</span>
      </summary>
      <ul className="why-here-list">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
        {!reasons.length ? (
          <li>Aligned with your current shelf signal.</li>
        ) : null}
      </ul>
      <p className="why-here-note">
        Evidence from your local shelf and resonance profile — not a claimed
        factual score about the title.
      </p>
    </details>
  );
}
