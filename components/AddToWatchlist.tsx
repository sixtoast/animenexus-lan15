"use client";

import type { Anime, WatchStatus } from "@/lib/types";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { fireSeal } from "@/components/SealMoment";

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
            add(anime, "planning");
            fireSeal(anime.title, "seal");
            showToast("Sealed to your list", "🕯️", true);
          }}
        >
          + Add to watchlist
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            add(anime, "watching");
            fireSeal(anime.title, "watching");
            showToast("Now watching", "▶", true);
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
          onChange={(e) => setStatus(anime.id, e.target.value as WatchStatus)}
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
          remove(anime.id);
          showToast("Removed from list", "·");
        }}
      >
        Remove
      </Button>
    </div>
  );
}
