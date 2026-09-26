"use client";

export type NexusSignal =
  | { type: "focus"; target: "discovery" | "recommendations" | "watchlist" | "franchise" | "artwork" | "watch-order" | "mood"; payload?: Record<string, unknown> }
  | { type: "filter"; payload: Record<string, unknown> }
  | { type: "travel"; from?: string; to: string };

const EVENT = "anime-nexus:intelligence";

export function emitNexusSignal(signal: NexusSignal) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NexusSignal>(EVENT, { detail: signal }));
}

export function onNexusSignal(handler: (signal: NexusSignal) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => handler((event as CustomEvent<NexusSignal>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
