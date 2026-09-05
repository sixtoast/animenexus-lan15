"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";

/** Three compact objects — not a dashboard. */
export function HomeYourWorld() {
  const { entries, ready } = useWatchlist();

  const watching = useMemo(
    () =>
      ready
        ? entries.filter((e) => e.watchStatus === "watching").length
        : 0,
    [ready, entries],
  );
  const planning = useMemo(
    () =>
      ready
        ? entries.filter((e) => e.watchStatus === "planning").length
        : 0,
    [ready, entries],
  );

  return (
    <nav className="home-world" aria-label="Your world">
      <Link href="/watchlist?status=watching" className="home-world-item">
        <span className="home-world-label">Continue</span>
        <span className="home-world-meta">
          {ready ? `${watching} active` : "—"}
        </span>
      </Link>
      <Link href="/watchlist" className="home-world-item">
        <span className="home-world-label">Shelf</span>
        <span className="home-world-meta">
          {ready ? `${entries.length} kept` : "—"}
        </span>
      </Link>
      <Link href="/taste" className="home-world-item">
        <span className="home-world-label">New signal</span>
        <span className="home-world-meta">
          {ready ? (planning ? `${planning} planned` : "Taste") : "—"}
        </span>
      </Link>
    </nav>
  );
}
