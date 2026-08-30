"use client";

import { useEffect, useRef } from "react";
import { logBehaviour } from "@/lib/behaviour-events";

type Props = {
  animeId: number;
  /** Intersection observer root margin */
  position?: number;
  children: React.ReactNode;
  className?: string;
};

/**
 * Soft exposure + hover tracking for recommendation cards.
 * Does not treat non-clicks as negative preference.
 */
export function BehaviourTracker({ animeId, position, children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const exposed = useRef(false);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.4) {
            if (!exposed.current) {
              exposed.current = true;
              logBehaviour("exposure", {
                animeId,
                meta: { position, visibleMs: 0 },
              });
              logBehaviour("rec_shown", { animeId });
            }
            visibleSince.current = Date.now();
          } else if (visibleSince.current) {
            const ms = Date.now() - visibleSince.current;
            visibleSince.current = null;
            if (ms >= 5000) {
              logBehaviour("hover", {
                animeId,
                meta: { visibleMs: ms, position },
                weight: 0.4,
              });
            }
          }
        }
      },
      { threshold: [0.4] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animeId, position]);

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={() => {
        visibleSince.current = Date.now();
      }}
      onMouseLeave={() => {
        if (!visibleSince.current) return;
        const ms = Date.now() - visibleSince.current;
        visibleSince.current = null;
        if (ms >= 1000) {
          logBehaviour("hover", {
            animeId,
            meta: { visibleMs: ms, position },
            weight: ms >= 5000 ? 0.5 : 0.2,
          });
        }
      }}
    >
      {children}
    </div>
  );
}
