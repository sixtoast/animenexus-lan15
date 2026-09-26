"use client";

export type NexusTarget =
  | "discovery" | "recommendations" | "watchlist" | "franchise"
  | "artwork" | "watch-order" | "mood";

export type NexusSignal =
  | { type: "focus"; target: NexusTarget; payload?: Record<string, unknown>; source?: "ai" | "user" | "system" }
  | { type: "filter"; payload: Record<string, unknown>; source?: "ai" | "user" | "system" }
  | { type: "travel"; from?: string; to: string; source?: "ai" | "user" | "system" };

export type NexusCommand = NexusSignal & { id: string; issuedAt: number };

const EVENT = "anime-nexus:intelligence";

function makeCommand(signal: NexusSignal): NexusCommand {
  return { ...signal, id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random(), issuedAt: Date.now() };
}

export function emitNexusSignal(signal: NexusSignal) {
  if (typeof window === "undefined") return;
  const command = makeCommand(signal);
  window.dispatchEvent(new CustomEvent<NexusCommand>(EVENT, { detail: command }));
  window.sessionStorage.setItem("anime-nexus:last-intelligence", JSON.stringify(command));
}

export function onNexusSignal(handler: (signal: NexusCommand) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => handler((event as CustomEvent<NexusCommand>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function getLastNexusCommand(): NexusCommand | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("anime-nexus:last-intelligence");
    return raw ? JSON.parse(raw) as NexusCommand : null;
  } catch { return null; }
}
