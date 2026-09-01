"use client";

import { useState } from "react";
import { logOutcome, type OutcomeStage } from "@/lib/outcome-events";
import { playCue } from "@/lib/sound-engine";
import { useWatchlist } from "@/components/WatchlistProvider";
import type { WatchStatus } from "@/lib/types";

type Props = {
  animeId: number;
  surface?: string;
};

const ACTIONS: {
  stage: OutcomeStage;
  label: string;
  status?: WatchStatus;
  cue: "success" | "ui_tap" | "error";
}[] = [
  { stage: "started", label: "Started", status: "watching", cue: "ui_tap" },
  {
    stage: "completed",
    label: "Finished",
    status: "completed",
    cue: "success",
  },
  {
    stage: "rewatched",
    label: "Rewatch",
    status: "completed",
    cue: "success",
  },
  { stage: "dropped", label: "Dropped", status: "dropped", cue: "error" },
];

/** Fast local outcome feedback for ranking + shelf status. */
export function QuickOutcomeControls({
  animeId,
  surface = "detail",
}: Props) {
  const { setStatus, getEntry, ready } = useWatchlist();
  const [last, setLast] = useState<string | null>(null);

  function mark(
    stage: OutcomeStage,
    status?: WatchStatus,
    cue: "success" | "ui_tap" | "error" = "ui_tap",
  ) {
    logOutcome(animeId, stage, { surface });
    if (status && ready && getEntry(animeId)) {
      setStatus(animeId, status);
    }
    playCue(cue);
    setLast(stage);
    window.setTimeout(() => setLast(null), 1600);
  }

  return (
    <div className="quick-outcome" aria-label="How did this go">
      <p className="tools-hint" style={{ marginBottom: 8 }}>
        Signal the desk — improves ranking on this device
      </p>
      <div className="quick-outcome-row">
        {ACTIONS.map((a) => (
          <button
            key={a.stage}
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => mark(a.stage, a.status, a.cue)}
          >
            {a.label}
          </button>
        ))}
      </div>
      {last ? (
        <p className="meta" role="status" style={{ marginTop: 6 }}>
          Logged · {last}
        </p>
      ) : null}
    </div>
  );
}
