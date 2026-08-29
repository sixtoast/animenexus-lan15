"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingSymbol } from "@/components/rive/LoadingSymbol";
import {
  loadingLabel,
  contextFromPath,
  type LoadingContext,
  LOADING_COPY,
} from "@/lib/loading-theatre";
import { playCue } from "@/lib/sound-engine";

/** Don't flash for sub-threshold waits. */
const SHOW_DELAY_MS = 180;
/** After this, escalate copy / allow acquisition cue */
const LONG_MS = 1200;

const PHASES = [
  "Tuning signal…",
  "Listening for catalogue…",
  "Catalogue found — resolving…",
] as const;

export function LoadingTheater() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string>(LOADING_COPY.default);
  const [phase, setPhase] = useState(0);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pending = useRef(false);
  const shownAt = useRef(0);

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
      }
    };
    const clearPhase = () => {
      if (phaseTimer.current) {
        clearInterval(phaseTimer.current);
        phaseTimer.current = null;
      }
    };

    const start = (e: Event) => {
      const d = (e as CustomEvent).detail as
        | { label?: string; context?: LoadingContext | string }
        | undefined;
      const next =
        d?.label ||
        loadingLabel(d?.context) ||
        loadingLabel(contextFromPath(pathname)) ||
        LOADING_COPY.default;
      setLabel(next);
      setPhase(0);
      pending.current = true;
      clearShowTimer();
      clearPhase();
      showTimer.current = setTimeout(() => {
        if (pending.current) {
          setVisible(true);
          shownAt.current = Date.now();
          phaseTimer.current = setInterval(() => {
            setPhase((p) => Math.min(p + 1, PHASES.length - 1));
          }, 900);
        }
      }, SHOW_DELAY_MS);
    };

    const stop = () => {
      const wasVisible = pending.current && visible;
      const elapsed = shownAt.current ? Date.now() - shownAt.current : 0;
      pending.current = false;
      clearShowTimer();
      clearPhase();
      setVisible(false);
      setPhase(0);
      // Meaningful long wait only
      if (wasVisible && elapsed >= LONG_MS) {
        playCue("signal_acquired");
      }
    };

    window.addEventListener("animenexus:loading-start", start);
    window.addEventListener("animenexus:loading-stop", stop);
    return () => {
      clearShowTimer();
      clearPhase();
      window.removeEventListener("animenexus:loading-start", start);
      window.removeEventListener("animenexus:loading-stop", stop);
    };
  }, [pathname, visible]);

  if (!visible) return null;

  const phaseLine = PHASES[phase] || PHASES[0];

  return (
    <div
      className="loading-theater nx-loading-signal loading-theater--calm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingSymbol phase={phase} level={3} label="Receiving signal" />
      <p className="loading-theater-label">{label}</p>
      <p className="loading-theater-phase">{phaseLine}</p>
      <p className="loading-theater-hint">
        No estimated progress — waiting on the network.
      </p>
    </div>
  );
}

export function loadingStart(contextOrLabel?: LoadingContext | string) {
  if (typeof window === "undefined") return;
  const isKey =
    !!contextOrLabel &&
    typeof contextOrLabel === "string" &&
    contextOrLabel in LOADING_COPY;
  window.dispatchEvent(
    new CustomEvent("animenexus:loading-start", {
      detail: isKey
        ? { context: contextOrLabel as LoadingContext }
        : { label: contextOrLabel || LOADING_COPY.default },
    }),
  );
}

export function loadingStop() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("animenexus:loading-stop"));
}
