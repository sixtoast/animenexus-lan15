"use client";

import type { Anime, WatchStatus } from "@/lib/types";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";

const STATUSES: { value: WatchStatus; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "watching", label: "Watching" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "dropped", label: "Dropped" },
];

type Props = {
  anime: Anime;
};

const FAIL_MSG = "The signal didn’t hold — could not save to this browser.";

export function AddToWatchlist({ anime }: Props) {
  const { ready, getEntry, add, remove, setStatus } = useWatchlist();
  const { showToast } = useToast();
  const entry = getEntry(anime.id);

  if (!ready) {
    return (
      <Button variant="outline" size="sm" loading disabled>
        Loading
      </Button>
    );
  }

  if (!entry) {
    return (
      <div className="wl-actions">
        <Button
          variant="accent"
          size="sm"
          onClick={() => {
            const ok = add(anime, "planning");
            if (ok) showToast("Sealed to your list", "🕯️", true);
            else showToast(FAIL_MSG, "⚠️");
          }}
        >
          + Add to watchlist
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const ok = add(anime, "watching");
            if (ok) showToast("Now watching", "▶", true);
            else showToast(FAIL_MSG, "⚠️");
          }}
        >
          Start watching
        </Button>
      </div>
    );
  }

  return (
    <div className="wl-actions">
      <label className="wl-status-label">
        <span className="filter-label">List status</span>
        <select
          className="filter-input"
          value={entry.watchStatus}
          onChange={(e) => {
            const ok = setStatus(anime.id, e.target.value as WatchStatus);
            if (!ok) showToast(FAIL_MSG, "⚠️");
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          const ok = remove(anime.id);
          if (ok) showToast("Removed from list", "·");
          else showToast(FAIL_MSG, "⚠️");
        }}
      >
        Remove
      </Button>
    </div>
  );
}
