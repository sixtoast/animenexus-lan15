"use client";

import { useEffect, useRef } from "react";
import { modalClosedBeat, modalOpenedBeat } from "@/lib/mascot/ui-theatre";

function isTrulyOpenOverlay(el: Element): boolean {
  if (el.hasAttribute("hidden")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  // Must be a real on-screen panel — avoids scroll noise / off-screen dialogs
  if (r.width < 80 || r.height < 80) return false;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (r.bottom < 20 || r.top > vh - 20 || r.right < 20 || r.left > vw - 20)
    return false;
  return true;
}

function anyModalOpen(): boolean {
  if (document.body.classList.contains("modal-open")) return true;
  const nodes = document.querySelectorAll(
    '[role="dialog"], .modal-root, .modal, .ai-panel, .cmdk-root',
  );
  for (const el of nodes) {
    if (el.classList.contains("open") || el.getAttribute("data-open") === "true") {
      if (isTrulyOpenOverlay(el)) return true;
      continue;
    }
    if (el.getAttribute("role") === "dialog" && isTrulyOpenOverlay(el)) {
      return true;
    }
  }
  return false;
}

/**
 * Watches dialogs / AI panel / cmdk and emits theatre events.
 * Strict open detection so scroll / rebuild does not fake modal open.
 */
export function UiTheatreBridge() {
  const wasOpen = useRef(false);
  const lastEmit = useRef(0);

  useEffect(() => {
    const check = () => {
      const open = anyModalOpen();
      const now = Date.now();
      // Debounce flaky transitions during scroll
      if (open === wasOpen.current) return;
      if (now - lastEmit.current < 700) return;

      if (open && !wasOpen.current) {
        const beat = modalOpenedBeat();
        lastEmit.current = now;
        wasOpen.current = true;
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-theatre", { detail: beat }),
        );
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-thought", {
            detail: { text: beat.thought, intent: beat.intent },
          }),
        );
        return;
      }
      if (!open && wasOpen.current) {
        const beat = modalClosedBeat();
        lastEmit.current = now;
        wasOpen.current = false;
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-theatre", { detail: beat }),
        );
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-thought", {
            detail: { text: beat.thought },
          }),
        );
      }
    };
    const id = window.setInterval(check, 600);
    check();
    return () => window.clearInterval(id);
  }, []);

  return null;
}
