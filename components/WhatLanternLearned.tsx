"use client";

import { useEffect, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  preferenceClusterLabels,
  preferenceTrendLine,
} from "@/lib/recommend-rank";
import { outcomeStats } from "@/lib/outcome-events";
import { readBehaviourEvents } from "@/lib/behaviour-events";

/** Privacy-transparent summary of local learning. */
export function WhatLanternLearned() {
  const { entries, ready } = useWatchlist();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({
    events: 0,
    clusters: [] as string[],
    trend: null as string | null,
    completionRate: null as number | null,
  });

  useEffect(() => {
    if (!ready) return;
    const o = outcomeStats();
    setStats({
      events: readBehaviourEvents().length,
      clusters: preferenceClusterLabels(entries),
      trend: preferenceTrendLine(entries),
      completionRate: o.completionRate,
    });
  }, [ready, entries, open]);

  if (!ready) return null;

  return (
    <details
      className="lantern-learned"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary>What Lantern learned (local only)</summary>
      <ul>
        <li>
          Interest modes:{" "}
          {stats.clusters.length
            ? stats.clusters.join(" · ")
            : "Not enough shelf signal yet"}
        </li>
        <li>{stats.trend || "No strong recent drift detected"}</li>
        <li>
          Behaviour events stored here: {stats.events} (this browser)
        </li>
        <li>
          Completion-weighted outcomes:{" "}
          {stats.completionRate != null
            ? `${Math.round(stats.completionRate * 100)}% of tracked starts`
            : "Not enough outcome data yet"}
        </li>
        <li>
          Not stored: passwords, payment data, or cross-user profiles on this
          device path.
        </li>
      </ul>
    </details>
  );
}
