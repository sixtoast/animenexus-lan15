"use client";

/**
 * Daily Ritual surface (Sprint 28).
 * One soft observation per day — no streak guilt, no nagging.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDailyRitual, type DailyRitual } from "@/lib/daily-ritual";
import { useWatchlist } from "@/components/WatchlistProvider";

export function RitualLine() {
  const { entries, ready } = useWatchlist();
  const [ritual, setRitual] = useState<DailyRitual | null>(null);

  useEffect(() => {
    if (!ready) return;
    setRitual(getDailyRitual(entries));
  }, [ready, entries]);

  if (!ritual) return null;

  return (
    <div className="ritual-line" role="status">
      <span className="ritual-kicker">Today</span>
      <p className="ritual-text">{ritual.text}</p>
      {ritual.href ? (
        <Link href={ritual.href} className="ritual-link">
          {ritual.label || "Open"} →
        </Link>
      ) : null}
    </div>
  );
}
