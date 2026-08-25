/**
 * Radar schedule helpers (Multi-API Sprint 11).
 * Categories: RAW / SUB / DUB · windows: TODAY / TOMORROW / THIS WEEK
 */

import type { AnimeBroadcast } from "./providers/types";

export type BroadcastBand = "raw" | "sub" | "dub";

export type TimeWindow = "today" | "tomorrow" | "week" | "later";

export type RadarContact = {
  anilistId: number;
  title: string;
  image?: string;
  episode?: number;
  band: BroadcastBand;
  at: string; // ISO
  delayed?: boolean;
  platforms?: string[];
  source: string;
  window: TimeWindow;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function classifyWindow(iso: string, now = new Date()): TimeWindow {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "later";
  const today0 = startOfDay(now).getTime();
  const tomorrow0 = today0 + 86_400_000;
  const weekEnd = today0 + 7 * 86_400_000;
  if (t >= today0 && t < tomorrow0) return "today";
  if (t >= tomorrow0 && t < tomorrow0 + 86_400_000) return "tomorrow";
  if (t >= today0 && t < weekEnd) return "week";
  return "later";
}

/** Prefer sub → raw → dub for a single "next" contact. */
export function pickNextFromBroadcasts(
  broadcasts: AnimeBroadcast[],
  now = Date.now(),
): { band: BroadcastBand; at: string; episode?: number; delayed?: boolean; platforms?: string[] } | null {
  type Cand = {
    band: BroadcastBand;
    at: string;
    episode?: number;
    delayed?: boolean;
    platforms?: string[];
    t: number;
  };
  const cands: Cand[] = [];
  for (const b of broadcasts) {
    const add = (band: BroadcastBand, iso?: string) => {
      if (!iso) return;
      const t = new Date(iso).getTime();
      if (Number.isNaN(t)) return;
      if (t < now - 3600_000) return; // allow slight past for "just aired"
      cands.push({
        band,
        at: iso,
        episode: b.episode,
        delayed: b.delayed,
        platforms: b.streamingServices,
        t,
      });
    };
    add("sub", b.subAt);
    add("raw", b.rawAt);
    add("dub", b.dubAt);
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.t - b.t || bandRank(a.band) - bandRank(b.band));
  const best = cands[0];
  return {
    band: best.band,
    at: best.at,
    episode: best.episode,
    delayed: best.delayed,
    platforms: best.platforms,
  };
}

function bandRank(b: BroadcastBand): number {
  return b === "sub" ? 0 : b === "raw" ? 1 : 2;
}

export function formatAirTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function groupContactsByWindow(
  contacts: RadarContact[],
): Record<TimeWindow, RadarContact[]> {
  const out: Record<TimeWindow, RadarContact[]> = {
    today: [],
    tomorrow: [],
    week: [],
    later: [],
  };
  for (const c of contacts) {
    out[c.window].push(c);
  }
  for (const k of Object.keys(out) as TimeWindow[]) {
    out[k].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }
  return out;
}
