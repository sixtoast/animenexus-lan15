"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ritualLine, readMemory } from "@/lib/lantern-memory";
import { useWatchlist } from "@/components/WatchlistProvider";

export function RitualLine() {
  const { entries, ready } = useWatchlist();
  const [line, setLine] = useState<string | null>(null);
  const [recentHref, setRecentHref] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const watching = entries
      .filter((e) => e.watchStatus === "watching")
      .map((e) => e.title);
    const planningCount = entries.filter(
      (e) => e.watchStatus === "planning",
    ).length;
    setLine(ritualLine({ watchingTitles: watching, planningCount }));
    const m = readMemory();
    if (m.recentViews[0]) {
      setRecentHref(`/anime/${m.recentViews[0].id}`);
    }
  }, [ready, entries]);

  if (!line) return null;

  return (
    <div className="ritual-line" role="status">
      <span className="ritual-kicker">Lantern</span>
      <p className="ritual-text">{line}</p>
      {recentHref ? (
        <Link href={recentHref} className="ritual-link">
          Resume last signal →
        </Link>
      ) : null}
    </div>
  );
}
