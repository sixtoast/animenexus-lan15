"use client";

import { useEffect, useState } from "react";
import { SignalBars } from "@/components/ui/SignalBars";

export function LoadingTheater() {
  const [on, setOn] = useState(false);
  const [label, setLabel] = useState("Tuning the frequency…");

  useEffect(() => {
    const start = (e: Event) => {
      const d = (e as CustomEvent).detail as { label?: string } | undefined;
      setLabel(d?.label || "Tuning the frequency…");
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
    <div className="loading-theater nx-loading-signal" role="status" aria-live="polite">
      <SignalBars level={4} animated label="Receiving signal" />
      <p>{label}</p>
    </div>
  );
}

export function loadingStart(label?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("animenexus:loading-start", { detail: { label } }),
  );
}

export function loadingStop() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("animenexus:loading-stop"));
}
