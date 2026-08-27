"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  clearAvailabilitySignals,
  readAvailabilitySignals,
  signalLine,
  type AvailabilitySignal,
} from "@/lib/availability-changes";

export function AvailabilitySignals() {
  const [signals, setSignals] = useState<AvailabilitySignal[]>([]);

  useEffect(() => {
    setSignals(readAvailabilitySignals());
  }, []);

  if (!signals.length) {
    return (
      <p className="tools-hint">
        No streaming changes recorded yet. Open anime Detail → Watch a few times
        over days — we only signal when a prior snapshot differs for your region.
      </p>
    );
  }

  return (
    <div>
      <ul className="theme-ul">
        {signals.slice(0, 12).map((s, i) => (
          <li key={`${s.id}-${s.provider}-${s.kind}-${s.at}-${i}`}>
            <Link href={`/anime/${s.id}`}>
              <strong>{s.title}</strong>
            </Link>
            <span className="tools-hint">
              {" "}
              · {s.kind === "added" ? "now on" : "left"} {s.provider} ({s.country})
              {" · "}
              {new Date(s.at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        style={{ marginTop: 10 }}
        onClick={() => {
          clearAvailabilitySignals();
          setSignals([]);
        }}
      >
        Clear signals
      </button>
      <p className="tools-hint" style={{ marginTop: 8 }}>
        Based on your visits only — not a global industry feed. Listing ≠
        subscription.
      </p>
    </div>
  );
}

/** Call from WhereToWatch after a successful fetch. */
export function useRecordWatchCheck(
  id: number,
  title: string,
  country: string | undefined,
  availability: { provider: string; type: string }[] | undefined,
) {
  useEffect(() => {
    if (!country || !availability) return;
    // Dynamic import path avoids circular UI deps when used inline
    void import("@/lib/availability-changes").then((m) => {
      m.recordAvailabilityCheck({
        id,
        title,
        country,
        availability: availability as import("@/lib/providers/watchmode").StreamingAvailability[],
      });
    });
  }, [id, title, country, availability]);
}
