"use client";

import { useEffect } from "react";
import { playCue, unlockSound } from "@/lib/sound-engine";

/**
 * Delegated UI taps for native .btn / role=button that don't use <Button />.
 * Skips elements marked data-silent-sound or already handled by ui Button.
 */
export function SoftBtnSounds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const hit = el.closest(
        "button.btn, a.btn, [role='button'].btn, button.cmdk-item, button.insight-dismiss, button.filter-chip",
      ) as HTMLElement | null;
      if (!hit) return;
      if (hit.hasAttribute("data-silent-sound")) return;
      if (hit.getAttribute("aria-disabled") === "true") return;
      if ((hit as HTMLButtonElement).disabled) return;
      // ui/Button sets data-nx-button
      if (hit.hasAttribute("data-nx-button")) return;
      void unlockSound().then(() => playCue("ui_tap"));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
