"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  readIntentSession,
  writeIntentSession,
  type IntentSession,
} from "@/lib/intent-session";
import { getExperienceIntent } from "@/lib/viewing-intent";
import { playCue } from "@/lib/sound-engine";

/** Compact active-session chip on browse when intent is set. */
export function BrowseSessionStrip() {
  const [session, setSession] = useState<IntentSession | null>(null);

  useEffect(() => {
    setSession(readIntentSession());
    const refresh = () => setSession(readIntentSession());
    window.addEventListener("animenexus:intent", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("animenexus:intent", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!session) return null;
  const hasPack = Boolean(session.slug);
  const nonDefault =
    session.intensity !== "moderate" ||
    session.energy !== "medium" ||
    session.minutesAvailable != null;
  if (!hasPack && !nonDefault) return null;

  const exp = session.slug ? getExperienceIntent(session.slug) : undefined;

  return (
    <div className="browse-session-strip" role="status">
      <div className="browse-session-text">
        <span className="active-session-kicker">Ranking with</span>
        <strong>
          {hasPack
            ? `${exp?.emoji ? exp.emoji + " " : ""}${exp?.label || session.slug}`
            : "Session dials"}
        </strong>
        <span className="meta">
          {session.intensity} · {session.energy}
          {session.minutesAvailable ? ` · ~${session.minutesAvailable}m` : ""}
        </span>
      </div>
      <div className="browse-session-actions">
        <Link href="/" className="btn btn-ghost btn-sm">
          Edit on home
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            writeIntentSession({
              slug: null,
              intensity: "moderate",
              energy: "medium",
              minutesAvailable: null,
            });
            setSession(readIntentSession());
            playCue("filter_select");
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
