/**
 * Built-in mascot event bus.
 *
 * App code (or other modules) can fire:
 *   window.dispatchEvent(new CustomEvent("animenexus:mascot", { detail: { name: "watchlist-add" } }))
 *   window.dispatchEvent(new CustomEvent("animenexus:mascot-action", { detail: { action: "wave" } }))
 *
 * Or call the helpers:
 *   emitMascotAppEvent("recommendation-engaged")
 *   runMascotAction("celebrate")
 */

import { mascotNotify, useMascotStore } from "./store";
import type { MascotAnim, MascotEvent } from "./types";
import { parseAppEventName, type AppUiEvent } from "./ui-events";

export type MascotAction =
  | "wave"
  | "point"
  | "jump"
  | "happy"
  | "celebrate"
  | "think"
  | "surprised"
  | "shy"
  | "bow"
  | "nod"
  | "stretch"
  | "sit"
  | "sleep"
  | "wake"
  | "pet"
  | "home";

const ACTION_ANIM: Partial<Record<MascotAction, MascotAnim>> = {
  wave: "wave",
  point: "point",
  jump: "jump",
  happy: "happy",
  celebrate: "celebrate",
  think: "think",
  surprised: "surprised",
  shy: "shy",
  bow: "bow",
  nod: "nod",
  stretch: "stretch",
  sit: "sit",
  sleep: "sleep",
};

const ACTION_TO_EVENT: Partial<Record<MascotAction, MascotEvent>> = {
  pet: { type: "pet" },
  home: { type: "go-to", x: 0.32, y: 0.08 },
  wake: { type: "wake" },
};

export function emitMascotAppEvent(name: string | AppUiEvent) {
  if (typeof window === "undefined") return;
  const parsed = typeof name === "string" ? parseAppEventName(name) : name;
  window.dispatchEvent(
    new CustomEvent("animenexus:mascot", { detail: { name: parsed } }),
  );
}

export function runMascotAction(action: MascotAction) {
  if (typeof window === "undefined") return;

  const animReq = ACTION_ANIM[action];
  if (animReq) {
    useMascotStore.getState().requestAnim(animReq);
    if (action === "jump" || action === "celebrate") {
      useMascotStore.setState({ jumpQueued: true });
    }
    if (action === "pet") mascotNotify({ type: "pet" });
    if (action === "home") mascotNotify({ type: "go-to", x: 0.32, y: 0.08 });
    return;
  }

  const ev = ACTION_TO_EVENT[action];
  if (ev) mascotNotify(ev);
}

export function installBuiltinMascotListeners(): () => void {
  if (typeof window === "undefined") return () => {};

  const onApp = (e: Event) => {
    const detail = (e as CustomEvent).detail as { name?: string } | undefined;
    if (detail?.name) {
      /* events are handled by ContextBridge / store subscribers */
    }
  };
  const onAction = (e: Event) => {
    const detail = (e as CustomEvent).detail as { action?: MascotAction } | undefined;
    if (detail?.action) runMascotAction(detail.action);
  };

  window.addEventListener("animenexus:mascot", onApp);
  window.addEventListener("animenexus:mascot-action", onAction);
  return () => {
    window.removeEventListener("animenexus:mascot", onApp);
    window.removeEventListener("animenexus:mascot-action", onAction);
  };
}

/** @deprecated use installBuiltinMascotListeners */
export const installBuiltinMascotEvents = installBuiltinMascotListeners;
