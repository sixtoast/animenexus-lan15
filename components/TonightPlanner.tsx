"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { rankTonight } from "@/lib/tonight-planner";

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
      <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={preferSkip}
          onChange={(e) => setPreferSkip(e.target.checked)}
        />{" "}
        Prefer skip-aware fit (uses duration only here; AniSkip on Detail binge)
      </label>

      <ol className="theme-ul" style={{ listStyle: "decimal", paddingLeft: 20 }}>
        {ranked.slice(0, 8).map((p) => (
          <li key={p.id} style={{ marginBottom: 10 }}>
            <Link href={`/anime/${p.id}`}>
              <strong>{p.title}</strong>
            </Link>
            <div className="tools-hint">
              {p.remainingEps} ep left · {p.reason}
              {p.fitsWithoutSkip || p.fitsWithSkip ? (
                <span style={{ color: "var(--color-accent)" }}> · fits</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="tools-hint" style={{ marginTop: 12 }}>
        Ranked for your shelf only — not a global seasonal schedule. Open Detail
        binge calculator for AniSkip savings on a title.
      </p>
    </div>
  );
}
