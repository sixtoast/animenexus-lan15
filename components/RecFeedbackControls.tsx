"use client";

/**
 * Recommendation feedback UI (Sprint 26).
 * Accept / not now / reject-with-reason — local learning only.
 */

import { useState } from "react";
import {
  markRecRejected,
  REJECT_REASON_LABELS,
  type RejectReason,
} from "@/lib/recommend-feedback";
import { useWatchlist } from "@/components/WatchlistProvider";
import type { Anime } from "@/lib/types";

type Props = {
  anime: Anime;
  onDismiss?: () => void;
};

const REASONS = Object.keys(REJECT_REASON_LABELS) as RejectReason[];

export function RecFeedbackControls({ anime, onDismiss }: Props) {
  const { add, getEntry, ready } = useWatchlist();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);
  const onShelf = ready && !!getEntry(anime.id);

  if (done === "rejected") {
    return (
      <p className="rec-fb rec-fb--done" role="status">
        Noted — less of this signal.
      </p>
    );
  }

  if (done === "accepted" || onShelf) {
    return (
      <p className="rec-fb rec-fb--done" role="status">
        On your shelf.
      </p>
    );
  }

  function accept() {
    // WatchlistProvider.add already markRecAccepted + seal on success
    const ok = add(anime, "planning");
    if (ok) {
      setDone("accepted");
      onDismiss?.();
    }
  }

  function reject(reason?: RejectReason) {
    markRecRejected(anime.id, reason);
    setDone("rejected");
    setOpen(false);
    onDismiss?.();
  }

  return (
    <div className="rec-fb">
      <div className="rec-fb-actions">
        <button
          type="button"
          className="rec-fb-btn rec-fb-btn--yes"
          onClick={accept}
        >
          Seal
        </button>
        <button
          type="button"
          className="rec-fb-btn"
          onClick={() => reject("not_now")}
        >
          Not now
        </button>
        <button
          type="button"
          className="rec-fb-btn rec-fb-btn--no"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Less like this
        </button>
      </div>
      {open ? (
        <div className="rec-fb-reasons" role="group" aria-label="Why not">
          {REASONS.filter((r) => r !== "not_now").map((r) => (
            <button
              key={r}
              type="button"
              className="rec-fb-reason"
              onClick={() => reject(r)}
            >
              {REJECT_REASON_LABELS[r]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
