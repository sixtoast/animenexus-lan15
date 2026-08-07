"use client";

import { useEffect, useRef } from "react";
import { modalClosedBeat, modalOpenedBeat } from "@/lib/mascot/ui-theatre";

/**
 * Watches dialogs / AI panel / cmdk and emits theatre events.
 */
export function UiTheatreBridge() {
  const wasOpen = useRef(false);

  useEffect(() => {
    const check = () => {
      const open = !!(
        document.querySelector(
          '[role="dialog"]:not([hidden]), .modal-root.open, .cmdk-root[data-open="true"], .ai-panel.open',
        ) || document.body.classList.contains("modal-open")
      );
      if (open && !wasOpen.current) {
        const beat = modalOpenedBeat();
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-theatre", { detail: beat }),
        );
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-thought", {
            detail: { text: beat.thought, intent: beat.intent },
          }),
        );
      }
      if (!open && wasOpen.current) {
        const beat = modalClosedBeat();
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-theatre", { detail: beat }),
        );
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-thought", {
            detail: { text: beat.thought },
          }),
        );
      }
      wasOpen.current = open;
    };
    const id = window.setInterval(check, 500);
    check();
    return () => window.clearInterval(id);
  }, []);

  return null;
}
