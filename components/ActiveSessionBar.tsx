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

/** Shows the active viewing-intent session on the home desk. */
export function ActiveSessionBar() {
  const [session, setSession] = useState<IntentSession | null>(null);

  useEffect(() => {
    setSession(readIntentSession());
    const refresh = () => setSession(readIntentSession());
    window.addEventListener("focus", refresh);
    window.addEventListener("animenexus:intent", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("animenexus:intent", refresh);
    };
  }, []);

  if (!session?.slug) return null;

  const exp = getExperienceIntent(session.slug);
  const label = exp?.label || session.slug;

  return (
    <div className="active-session-bar" role="status">
      <div className="active-session-main">
        <span className="active-session-kicker">Tonight’s intent</span>
        <strong>
          {exp?.emoji ? `${exp.emoji} ` : ""}
          {label}
        </strong>
        <span className="meta">
          {session.intensity} intensity · {session.energy} energy
          {session.minutesAvailable
            ? ` · ~${session.minutesAvailable}m`
            : ""}
        </span>
      </div>
      <div className="active-session-actions">
        <Link
          href={`/browse?experience=${encodeURIComponent(session.slug)}`}
          className="btn btn-outline btn-sm"
        >
          Browse this
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            writeIntentSession({ slug: null });
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
