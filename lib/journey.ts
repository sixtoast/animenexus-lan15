/**
 * Personal AnimeNexus journey (master plan · Timeline layer).
 * Only meaningful moments — no raw event spam.
 * On-device only; never invents events without evidence.
 */

import type { WatchlistEntry } from "./types";
import { readMemory, type LanternMemory } from "./lantern-memory";
import { describeUserResonance, userResonance } from "./resonance";

export type JourneyEvent = {
  id: string;
  at: string;
  kind:
    | "first_seen"
    | "first_seal"
    | "completion"
    | "genre_shift"
    | "rec_accept"
    | "tool"
    | "visit_streak"
    | "observation";
  title: string;
  body: string;
  href?: string;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Build chronological journey (newest first). */
export function buildJourney(
  entries: WatchlistEntry[],
  memory?: LanternMemory,
): JourneyEvent[] {
  const m = memory ?? (typeof window !== "undefined" ? readMemory() : null);
  if (!m) return [];

  const events: JourneyEvent[] = [];

  if (m.firstSeenAt) {
    events.push({
      id: "first-seen",
      at: m.firstSeenAt,
      kind: "first_seen",
      title: "First light",
      body: "Lantern opened the desk for the first time on this browser.",
    });
  }

  if (entries.length > 0) {
    // Approximate first seal: oldest entry without a better timestamp
    const sorted = [...entries].sort((a, b) => a.id - b.id);
    const first = sorted[0];
    events.push({
      id: `seal-${first.id}`,
      at: m.firstSeenAt || new Date().toISOString(),
      kind: "first_seal",
      title: "First seal",
      body: `“${first.title}” joined the shelf — the collection began.`,
      href: `/anime/${first.id}`,
    });
  }

  for (const c of m.completedLog.slice(0, 12)) {
    events.push({
      id: `done-${c.id}-${c.at}`,
      at: c.at,
      kind: "completion",
      title: "Completed",
      body: `Finished “${c.title}”.`,
      href: `/anime/${c.id}`,
    });
  }

  const topGenre = Object.entries(m.genreCounts).sort((a, b) => b[1] - a[1])[0];
  if (topGenre && topGenre[1] >= 3) {
    events.push({
      id: `genre-${topGenre[0]}`,
      at: m.lastVisitAt || new Date().toISOString(),
      kind: "genre_shift",
      title: "Genre signal",
      body: `${topGenre[0]} has shown up often in what you’ve opened (${topGenre[1]} times).`,
      href: `/browse?genre=${encodeURIComponent(topGenre[0])}`,
    });
  }

  if (m.recStats && m.recStats.accepted >= 1) {
    events.push({
      id: "rec-accept",
      at: m.lastVisitAt || new Date().toISOString(),
      kind: "rec_accept",
      title: "Recommendation accepted",
      body: `You’ve accepted ${m.recStats.accepted} recommendation signal${m.recStats.accepted === 1 ? "" : "s"}.`,
    });
  }

  if (m.visitDays.length >= 3) {
    events.push({
      id: "visits",
      at: m.lastVisitAt || new Date().toISOString(),
      kind: "visit_streak",
      title: "Return visits",
      body: `${m.visitDays.length} distinct days with the desk open — memory is accumulating.`,
    });
  }

  const lastTool = m.recentTools?.[0];
  if (lastTool) {
    events.push({
      id: `tool-${lastTool.tool}-${lastTool.at}`,
      at: lastTool.at,
      kind: "tool",
      title: "Tool opened",
      body: `Visited ${lastTool.tool}.`,
      href: lastTool.tool.startsWith("/") ? lastTool.tool : `/tools/${lastTool.tool}`,
    });
  }

  if (entries.length >= 2) {
    const line = describeUserResonance(userResonance(entries));
    events.push({
      id: "resonance-now",
      at: m.lastVisitAt || new Date().toISOString(),
      kind: "observation",
      title: "Current resonance",
      body: line,
      href: "/tools/stats",
    });
  }

  // Sort newest first; stable id dedupe
  const seen = new Set<string>();
  return events
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
}

/** Soft insights from memory + shelf (master plan · Insights). */
export function buildInsights(
  entries: WatchlistEntry[],
  memory?: LanternMemory,
): { id: string; text: string; confidence: "strong" | "soft"; href?: string }[] {
  const m = memory ?? (typeof window !== "undefined" ? readMemory() : null);
  if (!m) return [];
  const out: { id: string; text: string; confidence: "strong" | "soft"; href?: string }[] = [];

  const watching = entries.filter((e) => e.watchStatus === "watching");
  if (watching.length === 1) {
    const e = watching[0];
    out.push({
      id: "one-watching",
      text: `You’re mid-signal on “${e.title}” — episode ${e.progress || 0}.`,
      confidence: "strong",
      href: `/anime/${e.id}`,
    });
  } else if (watching.length > 1) {
    out.push({
      id: "multi-watching",
      text: `${watching.length} titles in Watching — Completionist can soft-rank what to finish first.`,
      confidence: "soft",
      href: "/tools/completionist",
    });
  }

  if (m.recStats && m.recStats.rejected > m.recStats.accepted && m.recStats.rejected >= 2) {
    out.push({
      id: "rec-reject",
      text: "You’ve been declining recommendations lately — the ranking layer will steer wider.",
      confidence: "soft",
    });
  }

  const top = Object.entries(m.genreCounts).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 4) {
    out.push({
      id: "genre-lean",
      text: `${top[0]} keeps showing up in what you open (${top[1]} views logged).`,
      confidence: top[1] >= 8 ? "strong" : "soft",
      href: `/browse?genre=${encodeURIComponent(top[0])}`,
    });
  }

  if (entries.length >= 2) {
    out.push({
      id: "resonance",
      text: describeUserResonance(userResonance(entries)),
      confidence: "soft",
      href: "/tools/stats",
    });
  }

  if (!out.length && entries.length === 0) {
    out.push({
      id: "empty",
      text: "Seal a few titles — insights appear once the shelf has signal.",
      confidence: "soft",
      href: "/browse",
    });
  }

  return out.slice(0, 6);
}
