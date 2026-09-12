"use client";

import { useEffect } from "react";
import { playCue, unlockSound } from "@/lib/sound-engine";

/**
 * Delegated UI taps across buttons, dock, chips, mood controls.
 * Skips data-silent-sound and components that already play their own cues.
 */
export function SoftBtnSounds() {
  useEffect(() => {
    const unlock = () => {
      void unlockSound();
    };
    // First gesture unlocks AudioContext (browsers require user gesture)
    document.addEventListener("pointerdown", unlock, {
      once: true,
      capture: true,
    });

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const hit = el.closest(
        [
          "button.btn",
          "a.btn",
          "[role='button'].btn",
          "button.cmdk-item",
          "button.insight-dismiss",
          "button.filter-chip",
          "a.filter-chip",
          ".filter-chip",
          ".mood-chip",
          "a.mood-chip",
          "button.mood-chip",
          ".nav-dock-item",
          "a.nav-dock-item",
          "button.nav-dock-item",
          ".feed-tab",
          "a.feed-tab",
          "button.feed-tab",
          ".chip",
          "button.chip",
          "[data-ix-sound]",
        ].join(", "),
      ) as HTMLElement | null;

      if (!hit) return;
      if (hit.hasAttribute("data-silent-sound")) return;
      if (hit.getAttribute("aria-disabled") === "true") return;
      if ((hit as HTMLButtonElement).disabled) return;
      // Dedicated Button component handles its own cue
      if (hit.hasAttribute("data-nx-button")) return;

      const custom = hit.getAttribute("data-ix-sound");
      const isNav =
        hit.classList.contains("nav-dock-item") ||
        hit.classList.contains("feed-tab") ||
        hit.closest(".nav-links");

      void unlockSound().then(() => {
        if (custom) {
          playCue(custom as Parameters<typeof playCue>[0]);
        } else if (isNav) {
          playCue("nav_tick");
        } else if (
          hit.classList.contains("filter-chip") ||
          hit.classList.contains("mood-chip") ||
          hit.classList.contains("chip")
        ) {
          playCue("filter_select");
        } else {
          playCue("ui_tap");
        }
      });
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", unlock, true);
    };
  }, []);

  return null;
}
