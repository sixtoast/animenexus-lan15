/**
 * Personal AnimeNexus journey (Sprint 9 + Sprint 30 integration).
 * Meaningful moments only — Memory · Taste · Watchlist · Recs · Sessions.
 * On-device only; never invents events without evidence.
 */

import type { WatchlistEntry } from "./types";
import { readMemory, type LanternMemory } from "./lantern-memory";
import { describeUserResonance, userResonance } from "./resonance";
import { buildTasteStory } from "./taste-story";
import { buildLanternInsights, type LanternInsight } from "./lantern-insights";

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
    | "taste_chapter"
    | "session"
    | "observation";
  title: string;
  body: string;
  href?: string;
};

/** Build chronological journey (newest first). */
export function buildJourney(
  entries: WatchlistEntry[],
  memory?: LanternMemory,
): JourneyEvent[] {
  const m = memory ?? (typeof window !== "undefined" ? readMemory() : null);
  if (!m) return [];

  const events: JourneyEvent[] = [];
  const nowIso = m.lastVisitAt || new Date().toISOString();

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
    const byAdded = [...entries].sort((a, b) => {
      const ta = new Date(a.addedAt || 0).getTime();
      const tb = new Date(b.addedAt || 0).getTime();
      if (ta && tb) return ta - tb;
      return a.id - b.id;
    });
    const first = byAdded[0];
    events.push({
      id: `seal-${first.id}`,
      at: first.addedAt || m.firstSeenAt || nowIso,
      kind: "first_seal",
      title: "First seal",
      body: `“${first.title}” joined the shelf — the collection began.`,
      href: `/anime/${first.id}`,
    });
  }

  for (const c of m.completedLog.slice(0, 16)) {
    events.push({
      id: `done-${c.id}-${c.at}`,
      at: c.at,
      kind: "completion",
      title: "Completed",
      body: `Finished “${c.title}”.`,
      href: `/anime/${c.id}`,
    });
  }

  // Taste chapters as journey moments
  const story = buildTasteStory(entries, m);
  for (const ch of story.chapters) {
    if (!ch.genres.length && !ch.evidence.length) continue;
    events.push({
      id: `taste-${ch.id}`,
      at: nowIso,
      kind: "taste_chapter",
      title: `Taste · ${ch.title}`,
      body: ch.summary,
      href: "/taste",
    });
  }

  const topGenre = Object.entries(m.genreCounts).sort((a, b) => b[1] - a[1])[0];
  if (topGenre && topGenre[1] >= 3) {
    events.push({
      id: `genre-${topGenre[0]}`,
      at: nowIso,
      kind: "genre_shift",
      title: "Genre signal",
      body: `${topGenre[0]} has shown up often in what you’ve opened (${topGenre[1]} times).`,
      href: `/browse?genre=${encodeURIComponent(topGenre[0])}`,
    });
  }

  if (m.recStats && m.recStats.accepted >= 1) {
    events.push({
      id: "rec-accept",
      at: nowIso,
      kind: "rec_accept",
      title: "Recommendation accepted",
      body: `You’ve sealed ${m.recStats.accepted} recommendation signal${m.recStats.accepted === 1 ? "" : "s"} (shown ${m.recStats.shown}).`,
    });
  }

  if (m.recStats && m.recStats.rejected >= 2) {
    events.push({
      id: "rec-reject-learn",
      at: nowIso,
      kind: "observation",
      title: "Teaching the desk",
      body: `${m.recStats.rejected} recommendations marked less like this — ranking steers away.`,
    });
  }

  if (m.visitDays.length >= 3) {
    events.push({
      id: "visits",
      at: nowIso,
      kind: "visit_streak",
      title: "Return visits",
      body: `${m.visitDays.length} distinct days with the desk open · ${m.sessionOpens} session opens.`,
    });
  }

  if (m.sessionOpens >= 1) {
    events.push({
      id: "sessions",
      at: nowIso,
      kind: "session",
      title: "Sessions",
      body: `${m.sessionOpens} time${m.sessionOpens === 1 ? "" : "s"} the desk was opened on this browser.`,
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
      href: lastTool.tool.startsWith("/")
        ? lastTool.tool
        : `/tools/${lastTool.tool}`,
    });
  }

  if (entries.length >= 2) {
    const line = describeUserResonance(userResonance(entries));
    events.push({
      id: "resonance-now",
      at: nowIso,
      kind: "observation",
      title: "Current resonance",
      body: line,
      href: "/tools/stats",
    });
  }

  const seen = new Set<string>();
  return events
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
}

/** Prefer shared Lantern Insights module (Sprint 27) when available. */
export function journeyInsights(
  entries: WatchlistEntry[],
  memory?: LanternMemory,
): LanternInsight[] {
  return buildLanternInsights(entries, { memory, limit: 5 });
}

/** @deprecated use journeyInsights — kept for older call sites */
export function buildInsights(
  entries: WatchlistEntry[],
  memory?: LanternMemory,
): { id: string; text: string; confidence: "strong" | "soft"; href?: string }[] {
  return journeyInsights(entries, memory).map((i) => ({
    id: i.id,
    text: i.text,
    confidence: i.confidenceLabel === "strong" ? "strong" : "soft",
  }));
}
