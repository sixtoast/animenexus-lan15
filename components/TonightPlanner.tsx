"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { rankTonight } from "@/lib/tonight-planner";
import {
  filterByAvailability,
  probeAvailableToMe,
  type AvailabilityProbe,
} from "@/lib/available-to-me";
import { readMyServices } from "@/lib/my-services";

function toEpCount(episodes: string | number | undefined | null): number {
  if (typeof episodes === "number" && Number.isFinite(episodes)) {
    return Math.max(0, episodes);
  }
  if (typeof episodes === "string") {
    const n = parseInt(episodes, 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

export function TonightPlanner() {
  const { entries, ready } = useWatchlist();
  const [minutes, setMinutes] = useState(90);
  const [preferSkip, setPreferSkip] = useState(true);
  const [availableToMe, setAvailableToMe] = useState(false);
  const [probes, setProbes] = useState<Map<number, AvailabilityProbe>>(new Map());
  const [probing, setProbing] = useState(false);
  const [hasServices, setHasServices] = useState(false);

  useEffect(() => {
    setHasServices(readMyServices().services.length > 0);
  }, []);

  const candidates = useMemo(() => {
    return entries
      .filter(
        (e) =>
          e.watchStatus === "watching" ||
          e.watchStatus === "planning" ||
          (e.watchStatus === "paused" && e.progress > 0),
      )
      .map((e) => ({
        id: e.id,
        title: e.title,
        image: e.image,
        progress: e.progress || 0,
        episodes: toEpCount(e.episodes),
        durationMin: e.duration || 24,
        watchStatus: e.watchStatus,
      }));
  }, [entries]);

  const ranked = useMemo(
    () => rankTonight(candidates, minutes, { preferSkip }),
    [candidates, minutes, preferSkip],
  );

  useEffect(() => {
    if (!availableToMe || !hasServices) {
      setProbes(new Map());
      return;
    }
    let cancelled = false;
    setProbing(true);
    // Probe top ranked only — quota safe
    const top = ranked.slice(0, 8).map((p) => ({ id: p.id, title: p.title }));
    void probeAvailableToMe(top, { limit: 8 }).then((map) => {
      if (!cancelled) {
        setProbes(map);
        setProbing(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [availableToMe, hasServices, ranked]);

  const display = useMemo(() => {
    if (!availableToMe || !hasServices) return ranked.slice(0, 8);
    return filterByAvailability(ranked, probes, { softKeepUnknown: true }).slice(
      0,
      8,
    );
  }, [ranked, availableToMe, hasServices, probes]);

  if (!ready) {
    return <p className="tools-hint">Loading shelf…</p>;
  }

  if (!candidates.length) {
    return (
      <p className="tools-hint">
        Add watching or planning titles to your watchlist — tonight needs a
        shelf to plan against.
      </p>
    );
  }

  return (
    <div className="tonight-planner">
      <div className="binge-row" style={{ marginBottom: 12 }}>
        <label htmlFor="tonight-min">Minutes available</label>
        <input
          id="tonight-min"
          type="number"
          min={15}
          max={480}
          step={15}
          value={minutes}
          onChange={(e) =>
            setMinutes(Math.max(15, parseInt(e.target.value, 10) || 15))
          }
        />
      </div>
      <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={preferSkip}
          onChange={(e) => setPreferSkip(e.target.checked)}
        />{" "}
        Prefer skip-aware fit (uses duration only here; AniSkip on Detail binge)
      </label>
      <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={availableToMe}
          onChange={(e) => setAvailableToMe(e.target.checked)}
          disabled={!hasServices}
        />{" "}
        Available to me (optional)
        {!hasServices ? (
          <span className="tools-hint">
            {" "}
            — set services on Account first
          </span>
        ) : probing ? (
          <span className="tools-hint"> — checking…</span>
        ) : null}
      </label>

      <ol className="theme-ul" style={{ listStyle: "decimal", paddingLeft: 20 }}>
        {display.map((p) => {
          const probe = probes.get(p.id);
          return (
            <li key={p.id} style={{ marginBottom: 10 }}>
              <Link href={`/anime/${p.id}`}>
                <strong>{p.title}</strong>
              </Link>
              <div className="tools-hint">
                {p.remainingEps} ep left · {p.reason}
                {p.fitsWithoutSkip || p.fitsWithSkip ? (
                  <span style={{ color: "var(--color-accent)" }}> · fits</span>
                ) : null}
                {availableToMe && probe && !probe.unknown && probe.onMyServices ? (
                  <span style={{ color: "var(--color-accent)" }}>
                    {" "}
                    · on {probe.providers.slice(0, 2).join(", ")}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="tools-hint" style={{ marginTop: 12 }}>
        Ranked for your shelf only. "Available to me" is optional and may miss
        titles when streaming data is incomplete — it never blocks ordinary
        recommendations.
      </p>
    </div>
  );
}
