/**
 * Optional "Available to me" constraint (API Expansion II Sprint 15).
 * Never mandatory — Watchmode coverage is incomplete and quota-limited.
 * Client caches results so we do not hit the API for every card in view.
 */

import {
  partitionByMyServices,
  readMyServices,
  type StreamingServiceId,
} from "./my-services";
import type { StreamingAvailability } from "./providers/watchmode";

const CACHE_KEY = "animenexus.stream-cache.v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h client-side

type CacheEntry = {
  at: number;
  country: string;
  onMyServices: boolean;
  providers: string[];
};

type CacheStore = Record<string, CacheEntry>;

function cacheKey(id: number, region: string): string {
  return `${id}|${region}`;
}

function readCache(): CacheStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheStore;
  } catch {
    return {};
  }
}

function writeCache(store: CacheStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function getCachedAvailability(
  id: number,
  region: string,
): CacheEntry | null {
  const e = readCache()[cacheKey(id, region)];
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL_MS) return null;
  return e;
}

function putCache(id: number, region: string, entry: Omit<CacheEntry, "at">) {
  const store = readCache();
  store[cacheKey(id, region)] = { ...entry, at: Date.now() };
  // Bound size
  const keys = Object.keys(store);
  if (keys.length > 200) {
    keys
      .sort((a, b) => (store[a].at || 0) - (store[b].at || 0))
      .slice(0, keys.length - 160)
      .forEach((k) => delete store[k]);
  }
  writeCache(store);
}

export type AvailabilityProbe = {
  id: number;
  onMyServices: boolean;
  providers: string[];
  country: string;
  fromCache: boolean;
  unknown: boolean;
};

/**
 * Probe up to `limit` titles sequentially (quota-safe).
 * Unknown (API fail / no key) does not exclude when soft mode is on.
 */
export async function probeAvailableToMe(
  ids: { id: number; title: string }[],
  opts?: {
    services?: StreamingServiceId[];
    region?: string;
    limit?: number;
  },
): Promise<Map<number, AvailabilityProbe>> {
  const prefs = readMyServices();
  const services = opts?.services ?? prefs.services;
  const region = (opts?.region || prefs.region || "US").toUpperCase().slice(0, 2);
  const limit = opts?.limit ?? 8;
  const out = new Map<number, AvailabilityProbe>();

  if (!services.length) {
    for (const t of ids.slice(0, limit)) {
      out.set(t.id, {
        id: t.id,
        onMyServices: false,
        providers: [],
        country: region,
        fromCache: false,
        unknown: true,
      });
    }
    return out;
  }

  for (const t of ids.slice(0, limit)) {
    const cached = getCachedAvailability(t.id, region);
    if (cached) {
      out.set(t.id, {
        id: t.id,
        onMyServices: cached.onMyServices,
        providers: cached.providers,
        country: cached.country,
        fromCache: true,
        unknown: false,
      });
      continue;
    }

    try {
      const q = new URLSearchParams({
        id: String(t.id),
        region,
        title: t.title,
      });
      const res = await fetch(`/api/streaming?${q}`);
      const j = (await res.json()) as {
        configured?: boolean;
        availability?: StreamingAvailability[];
        country?: string;
      };
      if (!j.configured) {
        out.set(t.id, {
          id: t.id,
          onMyServices: false,
          providers: [],
          country: region,
          fromCache: false,
          unknown: true,
        });
        break; // no key — stop burning attempts
      }
      const rows = j.availability || [];
      const { mine } = partitionByMyServices(rows, services);
      const onMy = mine.length > 0;
      const providers = mine.map((m) => m.provider);
      putCache(t.id, region, {
        country: j.country || region,
        onMyServices: onMy,
        providers,
      });
      out.set(t.id, {
        id: t.id,
        onMyServices: onMy,
        providers,
        country: j.country || region,
        fromCache: false,
        unknown: false,
      });
    } catch {
      out.set(t.id, {
        id: t.id,
        onMyServices: false,
        providers: [],
        country: region,
        fromCache: false,
        unknown: true,
      });
    }
  }

  return out;
}

/**
 * Filter list: keep on-my-services; keep unknown when softKeepUnknown.
 * Titles not probed are kept (do not drop the rest of the shelf).
 */
export function filterByAvailability<T extends { id: number }>(
  items: T[],
  probes: Map<number, AvailabilityProbe>,
  opts?: { softKeepUnknown?: boolean },
): T[] {
  const soft = opts?.softKeepUnknown ?? true;
  return items.filter((item) => {
    const p = probes.get(item.id);
    if (!p) return true; // not probed — keep
    if (p.unknown) return soft;
    return p.onMyServices;
  });
}
