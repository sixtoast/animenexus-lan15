"use client";

import { useEffect, useRef } from "react";
import {
  logBehaviour,
  logMeaningfulExposure,
} from "@/lib/behaviour-events";

type Props = {
  animeId: number;
  /** Rank position in shelf / grid */
  position?: number;
  /** Shelf or surface id for attribution */
  shelf?: string;
  recommendationId?: string;
  source?: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Soft exposure + hover tracking for recommendation cards.
 *
 * Rules (R1 / Sprint 2):
 * - Real exposure only after ≥50% visible for ≥1.5s continuous
 * - One exposure per anime per mount (no spam on scroll jank)
 * - Non-click / never-seen is neutral — never logged as negative
 */
export function BehaviourTracker({
  animeId,
  position,
  shelf,
  recommendationId,
  source,
  children,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const exposed = useRef(false);
  const visibleSince = useRef<number | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRatio = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const clearDwell = () => {
      if (dwellTimer.current) {
        clearTimeout(dwellTimer.current);
        dwellTimer.current = null;
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const ratio = e.intersectionRatio;
          lastRatio.current = ratio;
          const strong = e.isIntersecting && ratio >= 0.5;

          if (strong) {
            if (visibleSince.current == null) {
              visibleSince.current = Date.now();
            }
            if (!exposed.current && !dwellTimer.current) {
              dwellTimer.current = setTimeout(() => {
                dwellTimer.current = null;
                if (exposed.current) return;
                if (lastRatio.current < 0.5) return;
                const ms = visibleSince.current
                  ? Date.now() - visibleSince.current
                  : 1500;
                exposed.current = true;
                logMeaningfulExposure({
                  animeId,
                  visibleMs: Math.max(ms, 1500),
                  position,
                  shelf,
                  recommendationId,
                  source,
                  intersectionRatio: lastRatio.current,
                });
              }, 1500);
            }
          } else {
            clearDwell();
            if (visibleSince.current) {
              const ms = Date.now() - visibleSince.current;
              visibleSince.current = null;
              // Long passive dwell without prior formal exposure — weak signal only
              if (!exposed.current && ms >= 5000) {
                logBehaviour("hover", {
                  animeId,
                  recommendationId,
                  source,
                  meta: { visibleMs: ms, position, shelf },
                  weight: 0.25,
                });
              }
            }
          }
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    io.observe(el);
    return () => {
      clearDwell();
      io.disconnect();
    };
  }, [animeId, position, shelf, recommendationId, source]);

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={() => {
        if (!visibleSince.current) visibleSince.current = Date.now();
      }}
      onMouseLeave={() => {
        if (!visibleSince.current) return;
        const ms = Date.now() - visibleSince.current;
        if (ms >= 1000) {
          logBehaviour("hover", {
            animeId,
            recommendationId,
            source,
            meta: { visibleMs: ms, position, shelf },
            weight: ms >= 5000 ? 0.5 : 0.2,
          });
        }
      }}
    >
      {children}
    </div>
  );
}
