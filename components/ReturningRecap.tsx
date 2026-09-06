"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readMemory } from "@/lib/lantern-memory";
import { buildLanternInsights } from "@/lib/lantern-insights";
import { buildTasteForecast } from "@/lib/taste-forecast";
import { playCue } from "@/lib/sound-engine";

const SEEN_DAY_KEY = "anime_nexus_returning_recap_day";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Soft “since you were last here” recap for returning users.
 * Once per calendar day; soft-fail when evidence is thin.
 */
export function ReturningRecap() {
  const { entries, ready } = useWatchlist();
  const [show, setShow] = useState(false);

  const payload = useMemo(() => {
    if (!ready) return null;
    const m = readMemory();
    if ((m.visitDays?.length || 0) < 2) return null;
    if (entries.length < 2) return null;

    const insights = buildLanternInsights(entries, { memory: m, limit: 2 });
    const forecast = buildTasteForecast(entries);
    const lines: string[] = [];
    if (forecast.headline) lines.push(forecast.headline);
    for (const i of insights) lines.push(i.text);
    if (!lines.length) return null;

    const last = m.lastVisitAt
      ? new Date(m.lastVisitAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : null;

    return {
      lines: lines.slice(0, 3),
      last,
      visitDays: m.visitDays.length,
    };
  }, [ready, entries]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!payload) {
      setShow(false);
      return;
    }
    if (localStorage.getItem(SEEN_DAY_KEY) === todayKey()) {
      setShow(false);
      return;
    }
    setShow(true);
  }, [payload]);

  if (!show || !payload) return null;

  return (
    <section className="returning-recap" aria-label="Since your last visit">
      <div className="returning-recap-head">
        <div>
          <p className="returning-recap-kicker">Welcome back</p>
          <h2 className="returning-recap-title">
            {payload.last
              ? `Since around ${payload.last}`
              : "What Lantern noticed"}
          </h2>
        </div>
        <button
          type="button"
          className="returning-recap-dismiss"
          aria-label="Dismiss recap for today"
          onClick={() => {
            localStorage.setItem(SEEN_DAY_KEY, todayKey());
            playCue("filter_select");
            setShow(false);
          }}
        >
          ×
        </button>
      </div>
      <ul className="returning-recap-list">
        {payload.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="returning-recap-actions">
        <Link
          href="/taste"
          className="btn btn-outline btn-sm"
          onClick={() => {
            localStorage.setItem(SEEN_DAY_KEY, todayKey());
            playCue("filter_select");
          }}
        >
          Open Taste
        </Link>
        <Link
          href="/browse"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            localStorage.setItem(SEEN_DAY_KEY, todayKey());
          }}
        >
          Discover
        </Link>
      </div>
      <p className="returning-recap-note">
        Local only · {payload.visitDays} visit days logged on this device
      </p>
    </section>
  );
}
