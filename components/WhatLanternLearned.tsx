"use client";

import { useEffect, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  preferenceClusterLabels,
  preferenceTrendLine,
} from "@/lib/recommend-rank";
import { outcomeStats, readOutcomeCounts } from "@/lib/outcome-events";
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
    completed: 0,
    dropped: 0,
    started: 0,
  });

  useEffect(() => {
    if (!ready) return;
    const o = outcomeStats();
    const counts = readOutcomeCounts();
    setStats({
      events: readBehaviourEvents().length,
      clusters: preferenceClusterLabels(entries),
      trend: preferenceTrendLine(entries),
      completionRate: o.completionRate,
      completed: counts.completed,
      dropped: counts.dropped,
      started: counts.started,
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
          Outcomes · started {stats.started} · finished {stats.completed} ·
          dropped {stats.dropped}
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
