"use client";

import { useCallback, useEffect, useState } from "react";
import { playCue } from "@/lib/sound-engine";

const INTRO_KEY = "animenexus.intro.dismissed.v1";
const SESSION_KEY = "animenexus.session_touch.v1";

export type SessionTouchPayload = {
  isFirstVisit: boolean;
  daysAway: number;
  sessionOpens: number;
};

/** Written by LanternMemoryBoot for greetings / intro. */
export function readSessionTouch(): SessionTouchPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionTouchPayload;
  } catch {
    return null;
  }
}

export function writeSessionTouch(p: SessionTouchPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
}

function introDismissed(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

function dismissIntro() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* */
  }
}

/**
 * One-time first light (Sprint 45 quality).
 * CSS → soft SFX → copy. No forced Rive/3D intro movie.
 */
export function FirstVisitHost() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState(0);

  const close = useCallback(() => {
    dismissIntro();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (introDismissed()) return;
    const touch = readSessionTouch();
    if (touch && !touch.isFirstVisit && touch.sessionOpens > 1) return;

    const reduced =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-reduce-motion") === "true";

    setOpen(true);
    if (reduced) {
      setPhase(3);
      const t = window.setTimeout(close, 2200);
      return () => window.clearTimeout(t);
    }

    setPhase(0);
    // Soft ignition (touch only — not a success fanfare)
    const s0 = window.setTimeout(() => {
      try {
        playCue("ui_tap");
      } catch {
        /* sound opt-in / blocked */
      }
    }, 350);
    const t1 = window.setTimeout(() => setPhase(1), 400);
    const s1 = window.setTimeout(() => {
      try {
        playCue("seal");
      } catch {
        /* */
      }
    }, 1000);
    const t2 = window.setTimeout(() => setPhase(2), 1100);
    const t3 = window.setTimeout(() => setPhase(3), 1800);
    const t4 = window.setTimeout(close, 3600);
    return () => {
      window.clearTimeout(s0);
      window.clearTimeout(s1);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className={"first-visit" + (phase >= 2 ? " is-lit" : "")}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to AnimeNexus"
      data-first-visit-phase={phase}
    >
      <div className="first-visit-inner">
        <div
          className={
            "first-visit-glow" +
            (phase >= 1 ? " on" : "") +
            (phase >= 3 ? " settled" : "")
          }
          aria-hidden
        />
        <p className="first-visit-kicker">Lantern</p>
        <h2 className="first-visit-title">
          {phase < 2 ? "A frequency opens…" : "The desk is yours."}
        </h2>
        <p className="first-visit-body">
          {phase < 3
            ? "Browse, seal, and the room starts remembering — on this browser only."
            : "Skip anytime. No account required for the shelf."}
        </p>
        <button type="button" className="btn btn-outline btn-sm" onClick={close}>
          Skip introduction
        </button>
      </div>
    </div>
  );
}
