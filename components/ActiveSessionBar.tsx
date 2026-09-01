"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  readIntentSession,
  writeIntentSession,
  type IntentEnergy,
  type IntentIntensity,
  type IntentSession,
} from "@/lib/intent-session";
import { getExperienceIntent } from "@/lib/viewing-intent";
import { playCue } from "@/lib/sound-engine";
import { sessionShareUrl } from "@/lib/session-url";

const INTENSITIES: IntentIntensity[] = ["light", "moderate", "maximum"];
const ENERGIES: IntentEnergy[] = ["low", "medium", "high"];
const MINUTES = [null, 20, 30, 45, 60, 90] as const;

/** Active viewing-intent session + intensity/energy controls on the home desk. */
export function ActiveSessionBar() {
  const [session, setSession] = useState<IntentSession | null>(null);
  const [openControls, setOpenControls] = useState(false);

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

  if (!session) return null;

  const hasPack = Boolean(session.slug);
  const exp = session.slug ? getExperienceIntent(session.slug) : undefined;
  const label = exp?.label || session.slug;

  function persist(partial: Partial<IntentSession>) {
    const next = writeIntentSession(partial);
    setSession(next);
    playCue("filter_select");
  }

  async function shareSession() {
    const url = sessionShareUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: "AnimeNexus session",
          text: "Tonight's desk intent",
          url,
        });
        playCue("success");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        playCue("success");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        playCue("success");
      } catch {
        /* */
      }
    }
  }

  const nonDefault =
    session.intensity !== "moderate" ||
    session.energy !== "medium" ||
    session.minutesAvailable != null;

  if (!hasPack && !openControls && !nonDefault) {
    return (
      <div className="active-session-idle">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOpenControls(true)}
        >
          Tune intensity & energy →
        </button>
      </div>
    );
  }

  return (
    <div className="active-session-bar" role="status">
      <div className="active-session-main">
        <span className="active-session-kicker">
          {hasPack ? "Tonight’s intent" : "Session dials"}
        </span>
        {hasPack ? (
          <strong>
            {exp?.emoji ? `${exp.emoji} ` : ""}
            {label}
          </strong>
        ) : (
          <strong>No pack — dials still apply to ranking</strong>
        )}
        <span className="meta">
          {session.intensity} intensity · {session.energy} energy
          {session.minutesAvailable
            ? ` · ~${session.minutesAvailable}m`
            : ""}
        </span>
      </div>
      <div className="active-session-actions">
        {hasPack ? (
          <Link
            href={`/browse?experience=${encodeURIComponent(session.slug!)}`}
            className="btn btn-outline btn-sm"
          >
            Browse this
          </Link>
        ) : null}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-expanded={openControls}
          onClick={() => setOpenControls((v) => !v)}
        >
          {openControls ? "Hide dials" : "Dials"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void shareSession()}
        >
          Share
        </button>
        {hasPack || nonDefault ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              persist({
                slug: null,
                intensity: "moderate",
                energy: "medium",
                minutesAvailable: null,
              });
              setOpenControls(false);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {openControls ? (
        <div className="active-session-dials">
          <div
            className="session-dial-group"
            role="group"
            aria-label="Intensity"
          >
            <span className="filter-label">Intensity</span>
            <div className="session-dial-row">
              {INTENSITIES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={
                    "btn btn-sm " +
                    (session.intensity === v ? "btn-accent" : "btn-outline")
                  }
                  aria-pressed={session.intensity === v}
                  onClick={() => persist({ intensity: v })}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="session-dial-group" role="group" aria-label="Energy">
            <span className="filter-label">Energy</span>
            <div className="session-dial-row">
              {ENERGIES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={
                    "btn btn-sm " +
                    (session.energy === v ? "btn-accent" : "btn-outline")
                  }
                  aria-pressed={session.energy === v}
                  onClick={() => persist({ energy: v })}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div
            className="session-dial-group"
            role="group"
            aria-label="Minutes available"
          >
            <span className="filter-label">Time budget</span>
            <div className="session-dial-row">
              {MINUTES.map((m) => (
                <button
                  key={m ?? "any"}
                  type="button"
                  className={
                    "btn btn-sm " +
                    ((session.minutesAvailable ?? null) === m
                      ? "btn-accent"
                      : "btn-outline")
                  }
                  aria-pressed={(session.minutesAvailable ?? null) === m}
                  onClick={() => persist({ minutesAvailable: m })}
                >
                  {m == null ? "Any" : `${m}m`}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
