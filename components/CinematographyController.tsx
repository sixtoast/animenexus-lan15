"use client";

/**
 * Cinematography Director host (Awwwards Sprint 1).
 * Does not replace EnvironmentController — only composition/focus.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeNexus } from "@/lib/nexus";
import { getCinematography } from "@/lib/cinematography-store";

export function CinematographyController() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    getCinematography().applyRoute(pathname);
  }, [pathname]);

  useEffect(() => {
    const unsub = subscribeNexus((ev) => {
      const cinema = getCinematography();

      switch (ev.type) {
        case "anime_hovered":
          // Very minor — do not dim the site
          cinema.pulse(
            {
              focus: "anime",
              subjectId: ev.animeId,
              backgroundEmphasis: 0.06,
              foregroundEmphasis: 0.22,
              lanternAttention: 0.35,
              vignette: 0.03,
            },
            900,
          );
          break;

        case "anime_viewed":
          cinema.setFocus("anime", {
            subjectId: ev.animeId,
          });
          break;

        case "recommendation_opened":
        case "recommendation_shown":
          cinema.pulse(
            {
              focus: "recommendation",
              subjectId: ev.animeId,
              backgroundEmphasis: 0.15,
              foregroundEmphasis: 0.45,
              lanternAttention: 0.5,
              vignette: 0.08,
            },
            1400,
          );
          break;

        case "anime_added":
        case "recommendation_accepted":
          cinema.pulse(
            {
              focus: "celebration",
              subjectId: "animeId" in ev ? ev.animeId : undefined,
              backgroundEmphasis: 0.28,
              foregroundEmphasis: 0.65,
              vignette: 0.12,
              lanternAttention: 0.9,
              ambientContrast: 0.25,
            },
            2000,
          );
          break;

        case "anime_completed":
          cinema.pulse(
            {
              focus: "celebration",
              subjectId: ev.animeId,
              backgroundEmphasis: 0.32,
              foregroundEmphasis: 0.7,
              vignette: 0.14,
              lanternAttention: 0.95,
            },
            2400,
          );
          break;

        case "tool_opened": {
          const tool = (ev.tool || "").toLowerCase();
          if (tool.includes("oracle")) {
            cinema.setFocus("oracle");
          } else if (tool.includes("radar")) {
            cinema.setFocus("radar");
          } else {
            cinema.pulse(
              {
                focus: "navigation",
                lanternAttention: 0.4,
                foregroundEmphasis: 0.3,
              },
              1000,
            );
          }
          break;
        }

        case "page_viewed":
          cinema.applyRoute(ev.path || pathname);
          break;

        default:
          break;
      }
    });

    return unsub;
  }, [pathname]);

  return null;
}
