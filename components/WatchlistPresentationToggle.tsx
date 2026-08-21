"use client";

import { useEffect, useState } from "react";
import {
  readWatchlistPresentation,
  writeWatchlistPresentation,
  type WatchlistPresentation,
} from "@/lib/living-shelf";

export function WatchlistPresentationToggle({
  value,
  onChange,
}: {
  value?: WatchlistPresentation;
  onChange?: (mode: WatchlistPresentation) => void;
}) {
  const [mode, setMode] = useState<WatchlistPresentation>("manage");

  useEffect(() => {
    setMode(readWatchlistPresentation());
  }, []);

  const current = value ?? mode;

  function select(next: WatchlistPresentation) {
    setMode(next);
    writeWatchlistPresentation(next);
    onChange?.(next);
  }

  return (
    <div
      className="wl-presentation-toggle"
      role="group"
      aria-label="Watchlist presentation mode"
    >
      <button
        type="button"
        className={
          "btn btn-sm " + (current === "manage" ? "btn-accent" : "btn-outline")
        }
        aria-pressed={current === "manage"}
        aria-label="Manage list — edit status, progress, and ratings"
        onClick={() => select("manage")}
      >
        Manage
      </button>
      <button
        type="button"
        className={
          "btn btn-sm " + (current === "shelf" ? "btn-accent" : "btn-outline")
        }
        aria-pressed={current === "shelf"}
        aria-label="Shelf — spatial collection view"
        onClick={() => select("shelf")}
      >
        Shelf
      </button>
    </div>
  );
}
