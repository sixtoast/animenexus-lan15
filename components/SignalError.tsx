"use client";

import { useState } from "react";

type Props = {
  /** Soft, human-facing line */
  title?: string;
  /** Optional longer explanation */
  body?: string;
  /** Technical detail (HTTP, thrown message) — collapsed by default */
  detail?: string | null;
  /** Retry handler; omit to hide the button */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/**
 * Intelligent error state (master plan · Sprint 15).
 * Always: human message + optional technical detail + optional retry.
 */
export function SignalError({
  title = "The signal went quiet.",
  body = "AnimeNexus couldn’t complete this request.",
  detail,
  onRetry,
  retryLabel = "Try again",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const tech = (detail || "").trim();

  return (
    <div
      className={"state-box error signal-error " + className}
      role="alert"
    >
      <p className="signal-error-title">{title}</p>
      {body ? <p className="signal-error-body">{body}</p> : null}

      <div className="signal-error-actions">
        {onRetry ? (
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={onRetry}
          >
            {retryLabel}
          </button>
        ) : null}
        {tech ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide details" : "Technical details"}
          </button>
        ) : null}
      </div>

      {open && tech ? (
        <pre className="signal-error-detail">{tech}</pre>
      ) : null}
    </div>
  );
}

/** Map common failures to friendlier body copy. */
export function signalErrorBody(raw?: string | null): string {
  const t = (raw || "").toLowerCase();
  if (!t) return "AnimeNexus couldn’t complete this request.";
  if (t.includes("429") || t.includes("rate"))
    return "The upstream catalogue asked us to slow down. Wait a moment, then try again.";
  if (t.includes("network") || t.includes("fetch") || t.includes("failed to fetch"))
    return "A network hop failed. Check your connection and retry.";
  if (t.includes("anilist") || t.includes("500") || t.includes("502") || t.includes("503"))
    return "AnimeNexus couldn’t reach AniList (or a fallback provider).";
  if (t.includes("timeout"))
    return "The request took too long and was stopped.";
  return "AnimeNexus couldn’t complete this request.";
}
