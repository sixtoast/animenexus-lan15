/**
 * User streaming services preference (API Expansion II Sprint 13).
 * Explicit opt-in list — never assume subscriptions from Watchmode alone.
 */

export const MY_SERVICES_KEY = "animenexus.my-services.v1";
export const MY_REGION_KEY = "animenexus.streaming-region.v1";

/** Canonical service ids used for matching Watchmode provider names. */
export type StreamingServiceId =
  | "crunchyroll"
  | "netflix"
  | "prime"
  | "disney"
  | "hidive"
  | "hulu"
  | "max"
  | "apple"
  | "youtube"
  | "tubi"
  | "pluto"
  | "other";

export type StreamingServiceDef = {
  id: StreamingServiceId;
  label: string;
  /** Substrings matched against Watchmode `provider` (case-insensitive) */
  match: string[];
};

export const STREAMING_SERVICES: StreamingServiceDef[] = [
  {
    id: "crunchyroll",
    label: "Crunchyroll",
    match: ["crunchyroll"],
  },
  {
    id: "netflix",
    label: "Netflix",
    match: ["netflix"],
  },
  {
    id: "prime",
    label: "Prime Video",
    match: ["amazon prime", "prime video", "amazon"],
  },
  {
    id: "disney",
    label: "Disney+",
    match: ["disney+"],
  },
  {
    id: "hidive",
    label: "HIDIVE",
    match: ["hidive"],
  },
  {
    id: "hulu",
    label: "Hulu",
    match: ["hulu"],
  },
  {
    id: "max",
    label: "Max",
    match: ["max", "hbo max"],
  },
  {
    id: "apple",
    label: "Apple TV+",
    match: ["apple tv"],
  },
  {
    id: "youtube",
    label: "YouTube",
    match: ["youtube"],
  },
  {
    id: "tubi",
    label: "Tubi",
    match: ["tubi"],
  },
  {
    id: "pluto",
    label: "Pluto TV",
    match: ["pluto"],
  },
];

export type MyServicesPrefs = {
  services: StreamingServiceId[];
  region: string;
  updatedAt: string;
};

export function defaultRegion(): string {
  if (typeof navigator !== "undefined") {
    const lang = navigator.language || "";
    const m = lang.match(/-([A-Z]{2})/i);
    if (m) return m[1].toUpperCase();
  }
  return "US";
}

export function readMyServices(): MyServicesPrefs {
  if (typeof window === "undefined") {
    return { services: [], region: "US", updatedAt: "" };
  }
  try {
    const raw = localStorage.getItem(MY_SERVICES_KEY);
    const regionRaw = localStorage.getItem(MY_REGION_KEY);
    const services = raw
      ? (JSON.parse(raw) as StreamingServiceId[]).filter((id) =>
          STREAMING_SERVICES.some((s) => s.id === id),
        )
      : [];
    const region = (regionRaw || defaultRegion()).toUpperCase().slice(0, 2);
    return {
      services,
      region: region.length === 2 ? region : "US",
      updatedAt: "",
    };
  } catch {
    return { services: [], region: "US", updatedAt: "" };
  }
}

export function writeMyServices(prefs: {
  services: StreamingServiceId[];
  region: string;
}): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(MY_SERVICES_KEY, JSON.stringify(prefs.services));
    localStorage.setItem(
      MY_REGION_KEY,
      prefs.region.toUpperCase().slice(0, 2),
    );
    return true;
  } catch {
    return false;
  }
}

export function toggleService(
  current: StreamingServiceId[],
  id: StreamingServiceId,
): StreamingServiceId[] {
  if (current.includes(id)) return current.filter((x) => x !== id);
  return [...current, id];
}

/** Does this Watchmode provider name match a selected service? */
export function providerMatchesServices(
  providerName: string,
  selected: StreamingServiceId[],
): boolean {
  if (!selected.length) return false;
  const p = providerName.toLowerCase();
  for (const id of selected) {
    const def = STREAMING_SERVICES.find((s) => s.id === id);
    if (!def) continue;
    if (def.match.some((m) => p.includes(m))) return true;
  }
  return false;
}

export function partitionByMyServices<T extends { provider: string }>(
  rows: T[],
  selected: StreamingServiceId[],
): { mine: T[]; other: T[] } {
  if (!selected.length) return { mine: [], other: rows };
  const mine: T[] = [];
  const other: T[] = [];
  for (const r of rows) {
    if (providerMatchesServices(r.provider, selected)) mine.push(r);
    else other.push(r);
  }
  return { mine, other };
}
