"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Brief CRT / scanline sweep on client route changes.
 * Respects prefers-reduced-motion.
 */
export function RouteTune() {
  const pathname = usePathname();
  const first = useRef(true);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 420);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!flash) return null;

  return (
    <div className="nx-route-tune" aria-hidden>
      <div className="nx-route-tune-scan" />
      <div className="nx-route-tune-static" />
    </div>
  );
}
