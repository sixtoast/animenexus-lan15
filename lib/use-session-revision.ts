"use client";

import { useEffect, useState } from "react";

/** Bumps when intent session dials/pack change — use as a memo dependency. */
export function useSessionRevision(): number {
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const bump = () => setRev((n) => n + 1);
    window.addEventListener("animenexus:intent", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("animenexus:intent", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);
  return rev;
}
