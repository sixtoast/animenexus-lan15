/**
 * Signals inbox (API Expansion II Sprint 24).
 * Client-local history of soft signals — not push delivery.
 */

import {
  readAvailabilitySignals,
  signalLine,
  type AvailabilitySignal,
} from "./availability-changes";

const INBOX_KEY = "animenexus.signals-inbox.v1";
const MAX = 60;

export type SignalKind =
  | "streaming_added"
  | "streaming_removed"
  | "airing"
  | "radar"
  | "system";

export type InboxSignal = {
  id: string;
  kind: SignalKind;
  title: string;
  body: string;
  href?: string;
  animeId?: number;
  at: string;
  read: boolean;
};

function readRaw(): InboxSignal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as InboxSignal[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeRaw(items: InboxSignal[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INBOX_KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* */
  }
}

export function pushSignal(
  partial: Omit<InboxSignal, "id" | "at" | "read"> & {
    id?: string;
    at?: string;
    read?: boolean;
  },
): InboxSignal {
  const item: InboxSignal = {
    id:
      partial.id ||
      `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: partial.kind,
    title: partial.title,
    body: partial.body,
    href: partial.href,
    animeId: partial.animeId,
    at: partial.at || new Date().toISOString(),
    read: partial.read ?? false,
  };
  const next = [item, ...readRaw().filter((x) => x.id !== item.id)].slice(
    0,
    MAX,
  );
  writeRaw(next);
  return item;
}

function fromAvailability(s: AvailabilitySignal): InboxSignal {
  return {
    id: `stream-${s.id}-${s.provider}-${s.kind}-${s.at}`,
    kind: s.kind === "added" ? "streaming_added" : "streaming_removed",
    title: s.kind === "added" ? "Now streaming" : "Left a service",
    body: signalLine(s),
    href: `/anime/${s.id}`,
    animeId: s.id,
    at: s.at,
    read: false,
  };
}

/** Merge availability signals + inbox; de-dupe by id. */
export function listSignals(): InboxSignal[] {
  const inbox = readRaw();
  const stream = readAvailabilitySignals().map(fromAvailability);
  const byId = new Map<string, InboxSignal>();
  for (const s of [...inbox, ...stream]) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export function unreadCount(): number {
  return listSignals().filter((s) => !s.read).length;
}

export function markAllRead(): void {
  const merged = listSignals().map((s) => ({ ...s, read: true }));
  // Persist only non-stream-derived ids into inbox; stream signals stay in their store
  writeRaw(merged);
}

export function clearInbox(): void {
  writeRaw([]);
}

export function kindLabel(kind: SignalKind): string {
  switch (kind) {
    case "streaming_added":
      return "Streaming +";
    case "streaming_removed":
      return "Streaming −";
    case "airing":
      return "Airing";
    case "radar":
      return "Radar";
    default:
      return "Signal";
  }
}
