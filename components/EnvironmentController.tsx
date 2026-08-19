"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  applyEnvironmentToDocument,
  deriveEnvironment,
} from "@/lib/nexus-environment";
import { subscribeNexus } from "@/lib/nexus";

/**
 * Owns ambient environment: time, route, activity, reduced-motion.
 * Writes data-* attributes for CSS + mascot (no Sakura).
 */
export function EnvironmentController() {
  const pathname = usePathname() || "/";
  const activityRef = useRef(0.2);

  useEffect(() => {
    const unsub = subscribeNexus((ev) => {
      const bump =
        ev.type === "anime_viewed" ||
        ev.type === "anime_added" ||
        ev.type === "search_performed" ||
        ev.type === "tool_opened" ||
        ev.type === "recommendation_opened"
          ? 0.15
          : ev.type === "anime_hovered"
            ? 0.05
            : 0;
      if (bump) {
        activityRef.current = Math.min(1, activityRef.current + bump);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      (document.documentElement.getAttribute("data-reduce-motion") ===
        "true" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const tick = () => {
      activityRef.current = Math.max(0.15, activityRef.current * 0.92);
      const env = deriveEnvironment({
        path: pathname,
        reducedMotion: reduced,
        activity: activityRef.current,
      });
      applyEnvironmentToDocument(env);
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [pathname]);

  return null;
}
