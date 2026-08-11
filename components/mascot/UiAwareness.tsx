"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  pickInterestingLandmark,
  scanDomLandmarks,
  screenToHabitatTarget,
} from "@/lib/mascot/ui-registry";
import { mascotNotify } from "@/lib/mascot/store";

/**
 * Keeps the landmark registry warm and soft-notices interesting UI.
 * Does NOT force climb/go-to — LiveTerrain owns locomotion and home lock.
 * Auto go-to was causing idle home breakouts on scroll/timer.
 */
export function UiAwareness() {
  const pathname = usePathname();

  useEffect(() => {
    scanDomLandmarks();
    const t = window.setTimeout(scanDomLandmarks, 400);
    const t2 = window.setTimeout(scanDomLandmarks, 1200);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  // Soft notice only — store may bump curiosity; never teleports the 3D body
  useEffect(() => {
    const id = window.setInterval(() => {
      scanDomLandmarks();
      const lm = pickInterestingLandmark();
      if (!lm) return;
      mascotNotify({ type: "notice-ui", landmarkId: lm.id });
    }, 12_000);
    return () => window.clearInterval(id);
  }, []);

  // Hover anime cards → look that way (lookBias only)
  useEffect(() => {
    let last = 0;
    const onOver = (e: Event) => {
      const now = Date.now();
      if (now - last < 400) return;
      const el = (e.target as Element | null)?.closest?.(
        "[data-mascot-landmark], .anime-card, .home-rail-card",
      );
      if (!el) return;
      last = now;
      const r = el.getBoundingClientRect();
      mascotNotify({
        type: "ui-hover",
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
      });
    };
    document.addEventListener("pointerover", onOver, { passive: true });
    return () => document.removeEventListener("pointerover", onOver);
  }, []);

  return null;
}

export { screenToHabitatTarget };
