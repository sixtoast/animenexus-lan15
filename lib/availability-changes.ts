/**
 * Streaming availability changes (API Expansion II Sprint 16).
 * Diff local snapshots — does not require Watchmode Premium Changes API.
 * Only reports when we have a prior snapshot for the same title + country.
 */

import type { StreamingAvailability } from "./providers/watchmode";

const SNAP_KEY = "animenexus.stream-snapshots.v1";
const SIGNALS_KEY = "animenexus.stream-signals.v1";
const MAX_SIGNALS = 40;

export type AvailabilitySnapshot = {
  id: number;
  title: string;
  country: string;
  providers: string[];
  at: string;
};

export type AvailabilitySignal = {
  id: number;
  title: string;
  country: string;
  kind: "added" | "removed";
  provider: string;
  at: string;
};

type SnapStore = Record<string, AvailabilitySnapshot>;

function snapKey(id: number, country: string): string {
  return `${id}|${country.toUpperCase()}`;
}

function readSnaps(): SnapStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    return raw ? (JSON.parse(raw) as SnapStore) : {};
  } catch {
    return {};
  }
}

function writeSnaps(store: SnapStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(store));
  } catch {
    /* */
  }
}

export function readAvailabilitySignals(): AvailabilitySignal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SIGNALS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AvailabilitySignal[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeSignals(signals: AvailabilitySignal[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      SIGNALS_KEY,
      JSON.stringify(signals.slice(0, MAX_SIGNALS)),
    );
  } catch {
    /* */
  }
}

function providerSet(rows: StreamingAvailability[]): Set<string> {
  return new Set(
    rows
      .filter((r) => r.type === "subscription" || r.type === "free" || r.type === "ads")
      .map((r) => r.provider.trim())
      .filter(Boolean),
  );
}

/**
 * Compare current availability to last snapshot; append signals; save new snap.
 * Returns new signals for this check only.
 */
export function recordAvailabilityCheck(opts: {
  id: number;
  title: string;
  country: string;
  availability: StreamingAvailability[];
}): AvailabilitySignal[] {
  if (typeof window === "undefined") return [];
  const country = opts.country.toUpperCase().slice(0, 2);
  const now = new Date().toISOString();
  const current = providerSet(opts.availability);
  const providers = [...current].sort();

  const store = readSnaps();
  const key = snapKey(opts.id, country);
  const prev = store[key];
  const fresh: AvailabilitySignal[] = [];

  if (prev && prev.providers?.length >= 0) {
    const old = new Set(prev.providers);
    for (const p of current) {
      if (!old.has(p)) {
        fresh.push({
          id: opts.id,
          title: opts.title,
          country,
          kind: "added",
          provider: p,
          at: now,
        });
      }
    }
    for (const p of old) {
      if (!current.has(p)) {
        fresh.push({
          id: opts.id,
          title: opts.title,
          country,
          kind: "removed",
          provider: p,
          at: now,
        });
      }
    }
  }

  store[key] = {
    id: opts.id,
    title: opts.title,
    country,
    providers,
    at: now,
  };
  // Bound snapshots
  const keys = Object.keys(store);
  if (keys.length > 120) {
    keys
      .sort((a, b) => (store[a].at || "").localeCompare(store[b].at || ""))
      .slice(0, keys.length - 100)
      .forEach((k) => delete store[k]);
  }
  writeSnaps(store);

  if (fresh.length) {
    const all = [...fresh, ...readAvailabilitySignals()].slice(0, MAX_SIGNALS);
    writeSignals(all);
  }

  return fresh;
}

export function clearAvailabilitySignals(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SIGNALS_KEY);
  } catch {
    /* */
  }
}

export function signalLine(s: AvailabilitySignal): string {
  if (s.kind === "added") {
    return `${s.title} is now listed on ${s.provider} (${s.country}).`;
  }
  return `${s.title} is no longer listed on ${s.provider} (${s.country}).`;
}
