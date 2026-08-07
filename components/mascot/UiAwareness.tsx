"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  landmarkToHabitat,
  pickInterestingLandmark,
  scanDomLandmarks,
  screenToHabitatTarget,
} from "@/lib/mascot/ui-registry";
import { mascotNotify } from "@/lib/mascot/store";
import { clampToHabitat } from "@/lib/mascot/navigation";

/**
 * Keeps the landmark registry warm and nudges the companion toward UI.
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

  // Periodic notice of interesting landmarks
  useEffect(() => {
    const id = window.setInterval(() => {
      scanDomLandmarks();
      const lm = pickInterestingLandmark();
      if (!lm) return;
      // Soft notice — store decides if curious enough
      mascotNotify({ type: "notice-ui", landmarkId: lm.id });
      const hz = landmarkToHabitat(lm);
      if (hz && Math.random() < 0.35) {
        const t = clampToHabitat(hz.x, hz.z);
        mascotNotify({ type: "go-to", x: t.x, z: t.z });
      }
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  // Hover anime cards / landmark hosts → look that way
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
