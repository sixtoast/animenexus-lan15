"use client";

import { useEffect } from "react";

function bucket(h: number) {
  if (h < 5) return "late-night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "late-night";
}

/** Sets data-tod on <html> for ambient CSS — subtle room shift */
export function EnvironmentController() {
  useEffect(() => {
    const apply = () => {
      const b = bucket(new Date().getHours());
      document.documentElement.dataset.tod = b;
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
