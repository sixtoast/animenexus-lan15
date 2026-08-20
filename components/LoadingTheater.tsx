"use client";

import { useEffect, useState } from "react";
import { SignalBars } from "@/components/ui/SignalBars";
import {
  loadingLabel,
  type LoadingContext,
  LOADING_COPY,
} from "@/lib/loading-theatre";

export function LoadingTheater() {
  const [on, setOn] = useState(false);
  // Explicit string — LOADING_COPY is `as const` and would narrow setLabel otherwise
  const [label, setLabel] = useState<string>(LOADING_COPY.default);

  useEffect(() => {
    const start = (e: Event) => {
      const d = (e as CustomEvent).detail as
        | { label?: string; context?: LoadingContext | string }
        | undefined;
      setLabel(
        d?.label || loadingLabel(d?.context) || LOADING_COPY.default,
      );
      setOn(true);
    };
    const stop = () => setOn(false);
    window.addEventListener("animenexus:loading-start", start);
    window.addEventListener("animenexus:loading-stop", stop);
    return () => {
      window.removeEventListener("animenexus:loading-start", start);
      window.removeEventListener("animenexus:loading-stop", stop);
    };
  }, []);

  if (!on) return null;

  return (
    <div
      className="loading-theater nx-loading-signal"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <SignalBars level={4} animated label="Receiving signal" />
      <p>{label}</p>
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
