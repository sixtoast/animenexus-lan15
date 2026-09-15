"use client";

import { useEffect, useRef } from "react";
import { mascotNotify, useMascotStore } from "@/lib/mascot/store";
import { listLandmarks, refreshLandmarkRects, type Landmark } from "@/lib/mascot/ui-registry";
import { worldToScreen } from "@/lib/mascot/world-coords";
import { peekMovementCommand } from "@/lib/mascot/movement-command";

type Snapshot = { type: Landmark["type"]; cx: number; cy: number; width: number; height: number };
const REACTIVE = new Set<Landmark["type"]>(["card", "modal", "dropdown", "search", "notification", "hero"]);
const snapshot = (lm: Landmark): Snapshot | null => {
  const r = lm.rect;
  return r ? { type: lm.type, cx: r.left + r.width / 2, cy: r.top + r.height / 2, width: r.width, height: r.height } : null;
};

/**
 * Lightweight sensory layer for the 2.5D renderer.
 * It only reports meaningful UI changes to the existing mascot brain. It does
 * not choose locomotion, emotion, or animation itself.
 */
export function EnvironmentalReactions2D() {
  const position = useMascotStore(s => s.position);
  const enabled = useMascotStore(s => s.enabled);
  const previous = useRef(new Map<string, Snapshot>());
  const booted = useRef(false);
  const lastNoticeAt = useRef(0);
  const positionRef = useRef(position);
  positionRef.current = position;

  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    const inspect = () => {
      try {
        refreshLandmarkRects();
        const current = new Map<string, Snapshot>();
        const landmarks = listLandmarks();
        for (const lm of landmarks) {
          const s = snapshot(lm);
          if (s) current.set(lm.id, s);
        }
        if (!booted.current) {
          previous.current = current;
          booted.current = true;
          return;
        }

        const pos = positionRef.current;
        const mascot = pos ? worldToScreen(pos.x, pos.y) : { clientX: innerWidth / 2, clientY: innerHeight / 2 };
        const now = performance.now();
        if (now - lastNoticeAt.current > 1400 && !peekMovementCommand()) {
          let candidate: Landmark | null = null;
          let best = Infinity;
          for (const lm of landmarks) {
            if (!REACTIVE.has(lm.type) || !lm.rect) continue;
            const old = previous.current.get(lm.id);
            const s = current.get(lm.id)!;
            const appeared = !old;
            const openedOverlay = (lm.type === "modal" || lm.type === "dropdown") && lm.open && !old;
            const changed = !!old && (Math.abs(s.width - old.width) > 28 || Math.abs(s.height - old.height) > 28);
            if (!appeared && !openedOverlay && !changed) continue;
            const d = Math.hypot(s.cx - mascot.clientX, s.cy - mascot.clientY);
            const range = lm.type === "modal" || lm.type === "notification" ? 900 : 520;
            if (d <= range && d < best) { candidate = lm; best = d; }
          }
          if (candidate) {
            lastNoticeAt.current = now;
            mascotNotify({ type: "notice-ui", landmarkId: candidate.id });
          }
        }
        previous.current = current;
      } catch (error) {
        console.warn("[Lantern-ko 2D] environmental sensing failed", error);
      }
    };
    const schedule = () => { clearTimeout(timer); timer = window.setTimeout(inspect, 90); };
    inspect();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden", "data-open"] });
    window.addEventListener("resize", schedule);
    return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener("resize", schedule); };
  }, [enabled]);

  return null;
}
