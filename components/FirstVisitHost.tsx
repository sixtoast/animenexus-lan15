"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/MotionProvider";
import { playCue } from "@/lib/sound-engine";
import { LanternMark } from "@/components/LanternMark";
import {
  BRAND_INTRO_TIMING,
  markBrandIntroShown,
  shouldShowBrandIntro,
} from "@/lib/brand-intro-session";

const SESSION_KEY = "animenexus.session_touch.v1";

export type SessionTouchPayload = {
  isFirstVisit: boolean;
  daysAway: number;
  sessionOpens: number;
};

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
    /* private mode */
  }
}

export {
  shouldShowBrandIntro,
  markBrandIntroShown,
  BRAND_SESSION_KEY,
  BRAND_INTRO_TIMING,
} from "@/lib/brand-intro-session";

type IntroPhase =
  | "dark"
  | "spark"
  | "signal"
  | "presence"
  | "mark"
  | "wordmark"
  | "exit";

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

  const clearBoot = useCallback(() => {
    document.documentElement.removeAttribute("data-brand-intro");
    document.documentElement.removeAttribute("data-brand-boot");
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    markBrandIntroShown();
    clearBoot();
    setPhase("exit");
    const fade = reducedMotion
      ? BRAND_INTRO_TIMING.reducedExitFade
      : BRAND_INTRO_TIMING.exitFade;
    const exitTimer = window.setTimeout(() => {
      setVisible(false);
    }, fade);
    timers.current.push(exitTimer);
  }, [clearTimers, clearBoot, reducedMotion]);

  useEffect(() => {
    if (!ready || hasStarted.current) return;
    hasStarted.current = true;

    if (!shouldShowBrandIntro()) {
      clearBoot();
      return;
    }

    setVisible(true);
    document.documentElement.setAttribute("data-brand-intro", "active");

    if (reducedMotion) {
      setPhase("wordmark");
      timers.current.push(
        window.setTimeout(() => {
          finish();
        }, BRAND_INTRO_TIMING.reducedExit),
      );
      return clearTimers;
    }

    const schedule = (delay: number, callback: () => void) => {
      timers.current.push(window.setTimeout(callback, delay));
    };

    const T = BRAND_INTRO_TIMING;
    setPhase("dark");

    schedule(T.spark, () => {
      setPhase("spark");
      playCue("ui_tap", { gain: 0.45 });
    });

    schedule(T.signal, () => {
      setPhase("signal");
    });

    schedule(T.presence, () => {
      setPhase("presence");
    });

    schedule(T.mark, () => {
      setPhase("mark");
    });

    schedule(T.wordmark, () => {
      setPhase("wordmark");
      playCue("resonance", { gain: 0.65 });
    });

    schedule(T.exit, () => {
      finish();
    });

    return clearTimers;
  }, [clearTimers, clearBoot, finish, ready, reducedMotion]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish, visible]);

  useEffect(() => {
    return () => {
      clearTimers();
      clearBoot();
    };
  }, [clearTimers, clearBoot]);

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
          <LanternMark className="nx-brand-intro__mark" />
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
