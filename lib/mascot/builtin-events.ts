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

import { mascotNotify } from "./store";
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
  | "home"
  | "pet";

const ACTION_TO_EVENT: Record<MascotAction, MascotEvent> = {
  wave: { type: "app-event", name: "modal-close" }, // soft greet fallback
  point: { type: "notice-ui" },
  jump: { type: "jump" },
  happy: { type: "seal" },
  celebrate: { type: "complete" },
  think: { type: "empty-list" },
  surprised: { type: "error" },
  shy: { type: "app-event", name: "pet-long" },
  bow: { type: "app-event", name: "first-visit" },
  nod: { type: "app-event", name: "page-view" },
  stretch: { type: "idle-long" },
  sit: { type: "app-event", name: "loading-long" },
  sleep: { type: "loading", active: true },
  wake: { type: "loading", active: false },
  home: { type: "go-to", x: 0.32, y: 0.08 },
  pet: { type: "pet" },
};

/** Direct anim request via store (bypasses app-event cooldowns when needed). */
const ACTION_ANIM: Partial<Record<MascotAction, { anim: MascotAnim; holdMs: number; force?: boolean }>> = {
  wave: { anim: "wave", holdMs: 1200, force: true },
  point: { anim: "point", holdMs: 1100, force: true },
  jump: { anim: "jump", holdMs: 450, force: true },
  happy: { anim: "happy", holdMs: 1000, force: true },
  celebrate: { anim: "celebrate", holdMs: 1400, force: true },
  think: { anim: "think", holdMs: 1800 },
  surprised: { anim: "surprised", holdMs: 700, force: true },
  shy: { anim: "shy", holdMs: 1400, force: true },
  bow: { anim: "bow", holdMs: 1200, force: true },
  nod: { anim: "nod", holdMs: 800 },
  stretch: { anim: "stretch", holdMs: 1500 },
  sit: { anim: "sit", holdMs: 3000 },
  sleep: { anim: "sleep", holdMs: 8000 },
  wake: { anim: "surprised", holdMs: 500, force: true },
};

export function emitMascotAppEvent(name: string | AppUiEvent) {
  const parsed = typeof name === "string" ? parseAppEventName(name) : name;
  if (!parsed) return false;
  mascotNotify({ type: "app-event", name: parsed as MascotEvent extends { type: "app-event"; name: infer N } ? N : never });
  return true;
}

export function runMascotAction(action: MascotAction) {
  if (typeof window === "undefined") return;

  // Prefer explicit anim for gesture actions
  const animReq = ACTION_ANIM[action];
  if (animReq) {
    const { useMascotStore } = require("./store") as typeof import("./store");
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

let installed = false;

/**
 * Install window listeners once (call from LiveTerrain / root client).
 * Events:
 *  - animenexus:mascot        detail: { name: AppUiEvent }
 *  - animenexus:mascot-action detail: { action: MascotAction }
 *  - animenexus:mascot-notify detail: MascotEvent
 */
export function installBuiltinMascotEvents() {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener("animenexus:mascot", ((e: CustomEvent) => {
    const name = e.detail?.name ?? e.detail?.event;
    if (typeof name === "string") emitMascotAppEvent(name);
  }) as EventListener);

  window.addEventListener("animenexus:mascot-action", ((e: CustomEvent) => {
    const action = e.detail?.action as MascotAction | undefined;
    if (action) runMascotAction(action);
  }) as EventListener);

  window.addEventListener("animenexus:mascot-notify", ((e: CustomEvent) => {
    if (e.detail && typeof e.detail === "object" && "type" in e.detail) {
      mascotNotify(e.detail as MascotEvent);
    }
  }) as EventListener);

  // Convenience global for console / other scripts
  (window as unknown as { __lanternKo?: unknown }).__lanternKo = {
    emit: emitMascotAppEvent,
    action: runMascotAction,
    notify: mascotNotify,
  };
}
