"use client";

import { useCallback, useMemo, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  buildSessionCoverModel,
  downloadSessionCover,
  renderSessionCover,
  COVER_SIZES,
  type SessionCoverRatio,
} from "@/lib/session-cover";
import { Button } from "@/components/ui/Button";

const RATIOS = Object.keys(COVER_SIZES) as SessionCoverRatio[];

/**
 * Session Cover Generator 2.0 (Creative Sprint 16).
 * Editorial canvas export from local shelf data — no private OG without intent.
 */
export function SessionCoverStudio() {
  const { entries, ready } = useWatchlist();
  const [ratio, setRatio] = useState<SessionCoverRatio>("og");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const model = useMemo(
    () => buildSessionCoverModel({ entries }, ratio),
    [entries, ratio],
  );

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const canvas = await renderSessionCover(model);
      const url = canvas.toDataURL("image/png");
      setPreviewUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not render cover");
    } finally {
      setBusy(false);
    }
  }, [model]);

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadSessionCover(
        model,
        `animenexus-session-${model.layout}-${ratio}.png`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }, [model, ratio]);

  if (!ready) {
    return (
      <div className="state-box">
        <p>Opening shelf…</p>
      </div>
    );
  }

  return (
    <div className="nx-session-cover-studio">
      <p className="tools-hint">
        Editorial session covers from this browser’s shelf. Layout{" "}
        <strong>{model.layout}</strong> is chosen from your seals — not a random
        template dump.
      </p>

      <div className="daily-actions" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {RATIOS.map((r) => (
          <button
            key={r}
            type="button"
            className={
              "btn btn-sm " + (ratio === r ? "btn-accent" : "btn-outline")
            }
            aria-pressed={ratio === r}
            onClick={() => setRatio(r)}
          >
            {COVER_SIZES[r].label}
          </button>
        ))}
      </div>

      <p className="tools-hint">
        {model.dateLabel} · {model.statsLine}
        {model.resonanceLine ? ` · ${model.resonanceLine}` : ""}
      </p>

      <div className="daily-actions" style={{ marginTop: 12, gap: 8 }}>
        <Button
          type="button"
          variant="accent"
          size="sm"
          loading={busy}
          onClick={generate}
        >
          Preview cover
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={save}
        >
          Download PNG
        </Button>
      </div>

      {error ? (
        <div className="state-box error" style={{ marginTop: 12 }}>
          <p>{error}</p>
        </div>
      ) : null}

      {previewUrl ? (
        <div className="nx-session-cover-preview" style={{ marginTop: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Session cover preview"
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: 12,
              border: "1px solid rgba(240,160,144,0.25)",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
