"use client";

import { useEffect, useState } from "react";
import { lanternReactConcern } from "@/lib/mascot/nexus-attention-bridge";
import { OutcomeMark } from "@/components/rive/OutcomeMark";
import { playCue } from "@/lib/sound-engine";

export type SignalErrorKind =
  | "network"
  | "rate_limit"
  | "auth"
  | "empty"
  | "unsupported"
  | "media"
  | "generic";

type Props = {
  title?: string;
  body?: string;
  detail?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /** Semantic kind — drives default copy and whether SFX play */
  kind?: SignalErrorKind;
  /** Play warning SFX once when mounted (default: important kinds only) */
  playWarningSound?: boolean;
};

const KIND_DEFAULTS: Record<
  SignalErrorKind,
  { title: string; body: string; retryLabel: string; sound: boolean }
> = {
  network: {
    title: "Connection interrupted",
    body: "A network hop failed. Check your connection, then try again.",
    retryLabel: "Retry",
    sound: true,
  },
  rate_limit: {
    title: "Catalogue asked us to wait",
    body: "The upstream provider rate-limited this request. Pause briefly, then retry.",
    retryLabel: "Try again",
    sound: true,
  },
  auth: {
    title: "Sign-in required",
    body: "This action needs a valid account session. Re-authenticate, then continue.",
    retryLabel: "Open account",
    sound: false,
  },
  empty: {
    title: "Nothing matched",
    body: "No results for these filters. Broaden search or clear a chip.",
    retryLabel: "Clear filters",
    sound: false,
  },
  unsupported: {
    title: "Not available here",
    body: "This feature is not supported in the current environment or tier.",
    retryLabel: "Continue",
    sound: false,
  },
  media: {
    title: "Media did not load",
    body: "An image or media asset failed. The rest of the page remains usable.",
    retryLabel: "Retry media",
    sound: false,
  },
  generic: {
    title: "The signal went quiet",
    body: "AnimeNexus couldn’t complete this request.",
    retryLabel: "Try again",
    sound: true,
  },
};

/** Classify raw error text into a kind. */
export function classifySignalError(raw?: string | null): SignalErrorKind {
  const t = (raw || "").toLowerCase();
  if (!t) return "generic";
  if (t.includes("401") || t.includes("403") || t.includes("oauth") || t.includes("auth"))
    return "auth";
  if (t.includes("429") || t.includes("rate")) return "rate_limit";
  if (
    t.includes("network") ||
    t.includes("fetch") ||
    t.includes("failed to fetch") ||
    t.includes("timeout")
  )
    return "network";
  if (t.includes("no results") || t.includes("empty") || t.includes("not found"))
    return "empty";
  if (t.includes("unsupported") || t.includes("not available")) return "unsupported";
  if (t.includes("image") || t.includes("media") || t.includes("cloudinary"))
    return "media";
  return "generic";
}

/**
 * Differentiated error state (Creative Sprint 46).
 * Serious recovery-first UX — not cute.
 */
export function SignalError({
  title,
  body,
  detail,
  onRetry,
  retryLabel,
  className = "",
  kind: kindProp,
  playWarningSound,
}: Props) {
  const [open, setOpen] = useState(false);
  const tech = (detail || "").trim();
  const kind = kindProp || classifySignalError(detail);
  const defaults = KIND_DEFAULTS[kind];
  const resolvedTitle = title ?? defaults.title;
  const resolvedBody = body ?? defaults.body;
  const resolvedRetry = retryLabel ?? defaults.retryLabel;
  const shouldSound =
    playWarningSound !== undefined ? playWarningSound : defaults.sound;

  useEffect(() => {
    lanternReactConcern("signal-error");
    if (shouldSound) {
      try {
        playCue("error");
      } catch {
        /* sound opt-in */
      }
    }
  }, [shouldSound]);

  return (
    <div
      className={"state-box error signal-error " + className}
      role="alert"
      data-error-kind={kind}
    >
      <OutcomeMark tone="error" size="md" className="signal-error-mark" />
      <p className="signal-error-title">{resolvedTitle}</p>
      {resolvedBody ? (
        <p className="signal-error-body">{resolvedBody}</p>
      ) : null}

      <div className="signal-error-actions">
        {onRetry ? (
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={onRetry}
          >
            {resolvedRetry}
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
  const kind = classifySignalError(raw);
  return KIND_DEFAULTS[kind].body;
}
