"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readBehaviourEvents } from "@/lib/behaviour-events";
import {
  preferenceClusterLabels,
  preferenceTrendLine,
} from "@/lib/recommend-rank";
import { readMemory } from "@/lib/lantern-memory";

const DISMISS_KEY = "anime_nexus_cold_start_dismissed";

/**
 * Quiet first-session path: after a few meaningful actions, surface
 * one sentence of inferred intent — no questionnaire.
 */
export function ColdStartStrip() {
  const { entries, ready } = useWatchlist();
  const [show, setShow] = useState(false);
  const [line, setLine] = useState<string | null>(null);

  const signal = useMemo(() => {
    if (!ready) return null;
    const views = readMemory().recentViews?.length || 0;
    const events = readBehaviourEvents().filter((e) =>
      ["detail_open", "watchlist_add", "rec_open", "search"].includes(e.kind),
    ).length;
    const shelf = entries.length;
    const meaningful = views + events + shelf;
    if (meaningful < 3) return null;
    if (meaningful > 40) return null; // established user

    const clusters = preferenceClusterLabels(entries);
    const trend = preferenceTrendLine(entries);
    const parts: string[] = [];
    if (clusters[0]) parts.push(`leaning ${clusters[0].toLowerCase()}`);
    if (trend) parts.push(trend.replace(/^Recent drift:\s*/i, ""));
    if (!parts.length && shelf > 0) {
      parts.push("building a shelf signal — keep opening titles you care about");
    }
    if (!parts.length) return null;
    return parts.join(" · ");
  }, [ready, entries]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (!signal) {
      setShow(false);
      return;
    }
    setLine(signal);
    setShow(true);
  }, [signal]);

  if (!show || !line) return null;

  return (
    <div className="cold-start-strip" role="status">
      <div className="cold-start-body">
        <strong>Lantern is picking up a signal</strong>
        <p>{line}</p>
        <div className="cold-start-actions">
          <Link href="/mood/comfort" className="btn btn-accent btn-sm">
            Set tonight’s intent
          </Link>
          <Link href="/browse" className="btn btn-outline btn-sm">
            Browse
          </Link>
        </div>
      </div>
      <button
        type="button"
        className="cold-start-dismiss"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setShow(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
