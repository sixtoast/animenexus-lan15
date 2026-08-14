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
 * Sprint 9: throttled pointermove → cursor relationship (store handles state).
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

  useEffect(() => {
    const id = window.setInterval(() => {
      scanDomLandmarks();
      const lm = pickInterestingLandmark();
      if (!lm) return;
      mascotNotify({ type: "notice-ui", landmarkId: lm.id });
    }, 12_000);
    return () => window.clearInterval(id);
  }, []);

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

  // Sprint 9 — cursor as world object (throttled ~10 Hz)
  useEffect(() => {
    let last = 0;
    const onMove = (e: PointerEvent) => {
      const now = Date.now();
      if (now - last < 100) return;
      last = now;
      mascotNotify({
        type: "cursor-move",
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}

export { screenToHabitatTarget };
