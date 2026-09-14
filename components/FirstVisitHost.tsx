"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/MotionProvider";
import { playCue } from "@/lib/sound-engine";

const LEGACY_INTRO_KEY = "animenexus.intro.dismissed.v1";
const BRAND_SESSION_KEY = "animenexus.brand_intro.shown.v1";
const SESSION_KEY = "animenexus.session_touch.v1";

export type SessionTouchPayload = {
  isFirstVisit: boolean;
  daysAway: number;
  sessionOpens: number;
};

/**
 * Used by LanternMemoryBoot + HeroGreeting.
 * Keep these exports here unless they are deliberately migrated together.
 */
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

export function writeSessionTouch(payload: SessionTouchPayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Private browsing / unavailable storage.
  }
}

/** Session gate for brand ident — exported for unit tests. */
export function wasBrandIntroShownThisSession(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(BRAND_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBrandIntroShownThisSession() {
  try {
    sessionStorage.setItem(BRAND_SESSION_KEY, "1");
    // Retire the previous one-time onboarding overlay semantics.
    localStorage.setItem(LEGACY_INTRO_KEY, "1");
  } catch {
    // Storage may be unavailable.
  }
}

type IntroPhase =
  | "dark"
  | "spark"
  | "signal"
  | "presence"
  | "mark"
  | "wordmark"
  | "exit";

/**
 * AnimeNexus brand ignition.
 *
 * Visual only:
 * - runs once per browser session
 * - does not replay on client-side navigation
 * - tap/click/Escape skips immediately
 * - sound is enhancement only
 * - honours AnimeNexus MotionProvider
 *
 * Audio may not play on a true cold browser launch because browsers prohibit
 * autoplay before user interaction. The intro must still work perfectly silent.
 */
export function FirstVisitHost() {
  const { reducedMotion, ready } = useMotion();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>("dark");
  const timers = useRef<number[]>([]);
  const hasStarted = useRef(false);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) {
      window.clearTimeout(timer);
    }
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    markBrandIntroShownThisSession();
    document.documentElement.removeAttribute("data-brand-intro");
    setPhase("exit");
    const exitTimer = window.setTimeout(() => {
      setVisible(false);
    }, reducedMotion ? 80 : 180);
    timers.current.push(exitTimer);
  }, [clearTimers, reducedMotion]);

  useEffect(() => {
    if (!ready || hasStarted.current) return;
    hasStarted.current = true;

    if (wasBrandIntroShownThisSession()) return;

    setVisible(true);
    document.documentElement.setAttribute("data-brand-intro", "active");

    if (reducedMotion) {
      setPhase("wordmark");
      timers.current.push(
        window.setTimeout(() => {
          finish();
        }, 520),
      );
      return clearTimers;
    }

    const schedule = (delay: number, callback: () => void) => {
      timers.current.push(window.setTimeout(callback, delay));
    };

    /*
     * THE FIRST LIGHT
     *
     * 0ms     darkness
     * 150ms   ignition point
     * 340ms   Nexus signal/grid wakes
     * 610ms   Lantern presence / eyes
     * 760ms   lantern mark resolves
     * 950ms   AnimeNexus wordmark resolves
     * 1360ms  transition into the room
     * ~1540ms overlay removed
     */
    setPhase("dark");

    schedule(150, () => {
      setPhase("spark");
      // Enhancement only. playCue safely no-ops while audio is locked.
      playCue("ui_tap", { gain: 0.48 });
    });

    schedule(340, () => {
      setPhase("signal");
    });

    schedule(610, () => {
      setPhase("presence");
    });

    schedule(760, () => {
      setPhase("mark");
    });

    schedule(950, () => {
      setPhase("wordmark");
      // Existing Lantern-category resonance cue.
      playCue("resonance", { gain: 0.72 });
    });

    schedule(1360, () => {
      finish();
    });

    return clearTimers;
  }, [clearTimers, finish, ready, reducedMotion]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finish();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finish, visible]);

  useEffect(() => {
    return () => {
      clearTimers();
      document.documentElement.removeAttribute("data-brand-intro");
    };
  }, [clearTimers]);

  if (!visible) return null;

  return (
    <div
      className="nx-brand-intro"
      data-phase={phase}
      aria-hidden="true"
      onPointerDown={finish}
    >
      <div className="nx-brand-intro__field" />
      <div className="nx-brand-intro__signal" aria-hidden>
        <span className="nx-brand-intro__signal-ring nx-brand-intro__signal-ring--one" />
        <span className="nx-brand-intro__signal-ring nx-brand-intro__signal-ring--two" />
        <span className="nx-brand-intro__signal-ring nx-brand-intro__signal-ring--three" />
      </div>
      <div className="nx-brand-intro__presence" aria-hidden>
        <span className="nx-brand-intro__eye" />
        <span className="nx-brand-intro__eye" />
      </div>
      <div className="nx-brand-intro__brand">
        <div className="nx-brand-intro__lantern" aria-hidden>
          <span className="nx-brand-intro__lantern-handle" />
          <span className="nx-brand-intro__lantern-shell">
            <span className="nx-brand-intro__lantern-core" />
          </span>
        </div>
        <div className="nx-brand-intro__type">
          <span className="nx-brand-intro__name">AnimeNexus</span>
          <span className="nx-brand-intro__sub">Lantern</span>
        </div>
      </div>
      <div className="nx-brand-intro__flare" aria-hidden />
    </div>
  );
}
