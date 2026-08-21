"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SignalBars } from "@/components/ui/SignalBars";
import {
  loadingLabel,
  contextFromPath,
  type LoadingContext,
  LOADING_COPY,
} from "@/lib/loading-theatre";

/** Don't flash for sub-threshold waits. */
const SHOW_DELAY_MS = 180;

export function LoadingTheater() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string>(LOADING_COPY.default);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
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
      pending.current = true;
      clearShowTimer();
      showTimer.current = setTimeout(() => {
        if (pending.current) setVisible(true);
      }, SHOW_DELAY_MS);
    };

    const stop = () => {
      pending.current = false;
      clearShowTimer();
      setVisible(false);
    };

    window.addEventListener("animenexus:loading-start", start);
    window.addEventListener("animenexus:loading-stop", stop);
    return () => {
      clearShowTimer();
      window.removeEventListener("animenexus:loading-start", start);
      window.removeEventListener("animenexus:loading-stop", stop);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="loading-theater nx-loading-signal loading-theater--calm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <SignalBars level={3} animated label="Receiving signal" />
      <p className="loading-theater-label">{label}</p>
      <p className="loading-theater-hint">
        No estimated progress — waiting on the network.
      </p>
    </div>
  );
}

/** Start global theatre. Prefer a named context from LOADING_COPY. */
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
