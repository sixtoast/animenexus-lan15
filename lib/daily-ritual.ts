/**
 * Daily Ritual (Sprint 28).
 * One subtle observation per calendar day — no artificial streak pressure.
 * Built from real shelf/memory signals only.
 */

import { readMemory, ritualLine } from "./lantern-memory";
import type { WatchlistEntry } from "./types";

const DAY_KEY = "anime_nexus_daily_ritual_day";
const OBS_KEY = "anime_nexus_daily_ritual_obs";

export type DailyRitual = {
  text: string;
  /** Optional deep link */
  href?: string;
  label?: string;
  /** Stable id for the observation type */
  kind: string;
};

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function candidates(entries: WatchlistEntry[]): DailyRitual[] {
  const out: DailyRitual[] = [];
  const watching = entries.filter((e) => e.watchStatus === "watching");
  const planning = entries.filter((e) => e.watchStatus === "planning");
  const m = readMemory();

  // One episode left
  for (const e of watching) {
    const cap =
      typeof e.episodes === "number"
        ? e.episodes
        : parseInt(String(e.episodes || ""), 10);
    if (Number.isFinite(cap) && cap > 0 && e.progress === cap - 1) {
      out.push({
        kind: "one-left",
        text: `You only have one episode left on “${e.title}”.`,
        href: `/anime/${e.id}`,
        label: "Open",
      });
      break;
    }
  }

  // Unfinished watching
  if (watching[0] && !out.some((c) => c.kind === "one-left")) {
    out.push({
      kind: "mid-watch",
      text: `You’re mid-signal on “${watching[0].title}” (ep ${watching[0].progress || 0}).`,
      href: `/anime/${watching[0].id}`,
      label: "Continue",
    });
  }

  // Planning backlog soft nudge (not pressure)
  if (planning.length >= 1 && planning[0]) {
    out.push({
      kind: "planning-wait",
      text: `“${planning[0].title}” is still waiting on your planning shelf.`,
      href: `/anime/${planning[0].id}`,
      label: "Open",
    });
  }

  // Saved recommendation still waiting (recent view not on shelf)
  const onShelf = new Set(entries.map((e) => e.id));
  const recentOff = m.recentViews.find((r) => !onShelf.has(r.id));
  if (recentOff) {
    out.push({
      kind: "recent-open",
      text: `You opened “${recentOff.title}” recently — still not sealed.`,
      href: `/anime/${recentOff.id}`,
      label: "Revisit",
    });
  }

  // Genre not explored lately
  const prefs = Object.entries(m.genreCounts).sort((a, b) => b[1] - a[1]);
  if (prefs.length >= 2) {
    const rare = prefs[prefs.length - 1]?.[0];
    if (rare) {
      out.push({
        kind: "genre-drift",
        text: `You haven’t leaned into ${rare} much lately — optional detour.`,
        href: `/browse?genre=${encodeURIComponent(rare)}`,
        label: "Browse",
      });
    }
  }

  // Fallback: existing ritual line (time-of-day / memory)
  const watchingTitles = watching.map((e) => e.title);
  out.push({
    kind: "ambient",
    text: ritualLine({
      watchingTitles,
      planningCount: planning.length,
    }),
  });

  return out;
}

/**
 * Pick one observation for today. Stable within the calendar day.
 */
export function getDailyRitual(entries: WatchlistEntry[]): DailyRitual {
  const list = candidates(entries);
  const day = todayKey();

  if (typeof window === "undefined") {
    return list[0];
  }

  try {
    const storedDay = localStorage.getItem(DAY_KEY);
    const storedObs = localStorage.getItem(OBS_KEY);
    if (storedDay === day && storedObs) {
      const parsed = JSON.parse(storedObs) as DailyRitual;
      if (parsed?.text) return parsed;
    }

    // Prefer non-ambient when available; rotate by day-of-year
    const ranked = list.filter((c) => c.kind !== "ambient");
    const pool = ranked.length ? ranked : list;
    const doy = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000,
    );
    const pick = pool[doy % pool.length];

    localStorage.setItem(DAY_KEY, day);
    localStorage.setItem(OBS_KEY, JSON.stringify(pick));
    return pick;
  } catch {
    return list[0];
  }
}
