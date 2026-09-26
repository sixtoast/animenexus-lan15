"use client";

export type NexusTarget =
  | "discovery" | "recommendations" | "watchlist" | "franchise"
  | "artwork" | "watch-order" | "mood";

export type NexusSignal =
  | { type: "focus"; target: NexusTarget; payload?: Record<string, unknown>; source?: "ai" | "user" | "system" }
  | { type: "filter"; payload: Record<string, unknown>; source?: "ai" | "user" | "system" }
  | { type: "travel"; from?: string; to: string; source?: "ai" | "user" | "system" };

export type NexusCommand = NexusSignal & { id: string; issuedAt: number };

export type NexusFieldMode =
  | "discovery"
  | "recommendations"
  | "mood"
  | "watchlist"
  | "franchise"
  | "artwork"
  | "watch-order";

export type NexusFieldState = {
  mode: NexusFieldMode;
  commandId: string | null;
  label: string;
  changedAt: number;
};

const EVENT = "anime-nexus:intelligence";
const LAST_KEY = "anime-nexus:last-intelligence";
const FIELD_KEY = "anime-nexus:field-state";
const SEEN_KEY = "anime-nexus:seen-intelligence";

function modeForSignal(signal: NexusSignal): NexusFieldMode {
  if (signal.type === "filter") {
    const mode = signal.payload.mode;
    if (
      mode === "discovery" ||
      mode === "recommendations" ||
      mode === "mood" ||
      mode === "watchlist" ||
      mode === "franchise" ||
      mode === "artwork" ||
      mode === "watch-order"
    ) return mode;
  }
  if (signal.type === "focus") {
    if (signal.target === "discovery") return "discovery";
    if (signal.target === "recommendations") return "recommendations";
    if (signal.target === "mood") return "mood";
    if (signal.target === "watchlist") return "watchlist";
    if (signal.target === "franchise") return "franchise";
    if (signal.target === "artwork") return "artwork";
    if (signal.target === "watch-order") return "watch-order";
  }
  return "discovery";
}

function labelForSignal(signal: NexusSignal, mode: NexusFieldMode): string {
  const payloadLabel = signal.type === "filter" && typeof signal.payload.label === "string"
    ? signal.payload.label
    : null;
  if (payloadLabel) return payloadLabel.slice(0, 120);
  const labels: Record<NexusFieldMode, string> = {
    discovery: "Discovery field recalibrated",
    recommendations: "Recommendation field recalibrated",
    mood: "Mood field recalibrated",
    watchlist: "Watchlist constellation focused",
    franchise: "Franchise space focused",
    artwork: "Artwork space focused",
    "watch-order": "Watch order space focused",
  };
  return labels[mode];
}

function persistFieldState(command: NexusCommand) {
  if (typeof window === "undefined") return;
  const mode = modeForSignal(command);
  const state: NexusFieldState = {
    mode,
    commandId: command.id,
    label: labelForSignal(command, mode),
    changedAt: command.issuedAt,
  };
  try {
    window.sessionStorage.setItem(FIELD_KEY, JSON.stringify(state));
  } catch {
    /* session persistence is best-effort */
  }
}

function makeCommand(signal: NexusSignal): NexusCommand {
  return { ...signal, id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random(), issuedAt: Date.now() };
}

export function emitNexusSignal(signal: NexusSignal) {
  if (typeof window === "undefined") return;
  const command = makeCommand(signal);
  persistFieldState(command);
  window.dispatchEvent(new CustomEvent<NexusCommand>(EVENT, { detail: command }));
  try {
    window.sessionStorage.setItem(LAST_KEY, JSON.stringify(command));
  } catch {
    /* */
  }
}

export function readNexusFieldState(): NexusFieldState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(FIELD_KEY);
    return raw ? JSON.parse(raw) as NexusFieldState : null;
  } catch {
    return null;
  }
}

/** Prevent the same command being applied twice after remounts/route changes. */
export function claimNexusCommand(id: string, scope = "global"): boolean {
  if (typeof window === "undefined") return true;
  try {
    const key = scope === "global" ? SEEN_KEY : `${SEEN_KEY}:${scope}`;
    const raw = window.sessionStorage.getItem(key);
    const seen = raw ? JSON.parse(raw) as string[] : [];
    if (seen.includes(id)) return false;
    const next = [...seen.slice(-31), id];
    window.sessionStorage.setItem(key, JSON.stringify(next));
    return true;
  } catch {
    return true;
  }
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
    const raw = window.sessionStorage.getItem(LAST_KEY);
    return raw ? JSON.parse(raw) as NexusCommand : null;
  } catch { return null; }
}
