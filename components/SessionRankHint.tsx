"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { readIntentSession } from "@/lib/intent-session";
import { useSessionRevision } from "@/lib/use-session-revision";
import { formatSessionLine } from "@/lib/session-line";

type Props = {
  className?: string;
  /** When true, returns null if only defaults (no pack / dials). */
  hideWhenDefault?: boolean;
  /** Optional fallback when session is default. */
  fallback?: ReactNode;
};

/**
 * Shared “Ranking with · …” status line for tools that soft-rank by session.
 */
export function SessionRankHint({
  className = "tools-hint",
  hideWhenDefault = true,
  fallback = null,
}: Props) {
  const sessionKey = useSessionRevision();
  const line = useMemo(() => {
    void sessionKey;
    return formatSessionLine(readIntentSession());
  }, [sessionKey]);

  if (!line) {
    if (hideWhenDefault) return fallback ? <>{fallback}</> : null;
    return null;
  }

  return (
    <p className={className} role="status" aria-live="polite">
      Ranking with · {line}
      {" · "}
      <Link
        href="/"
        className="btn btn-ghost btn-sm"
        style={{ display: "inline", padding: "0 4px", minHeight: 0 }}
      >
        Edit on home
      </Link>
    </p>
  );
}
