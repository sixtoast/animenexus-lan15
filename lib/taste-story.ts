/**
 * Taste as a story (master plan · Sprint 20).
 * Turns shelf + memory into Earlier → Current → Emerging chapters with evidence.
 * Claims stay local and evidence-backed — no invented preferences.
 */

import {
  getGenrePreferences,
  readMemory,
  type LanternMemory,
  type PreferenceSignal,
} from "./lantern-memory";
import type { WatchlistEntry } from "./types";

export type TasteChapter = {
  id: "earlier" | "current" | "emerging";
  title: string;
  summary: string;
  genres: string[];
  evidence: string[];
  confidence: number;
};

export type TasteStory = {
  headline: string;
  chapters: TasteChapter[];
  hasEnoughSignal: boolean;
};

function genreCountsFromEntries(
  entries: WatchlistEntry[],
  predicate: (e: WatchlistEntry) => boolean,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!predicate(e)) continue;
    for (const g of e.genres || []) {
      const k = g.trim();
      if (!k) continue;
      map.set(k, (map.get(k) || 0) + 1);
    }
  }
  return map;
}

function topFromMap(map: Map<string, number>, n: number): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function medianTime(entries: WatchlistEntry[]): number {
  if (!entries.length) return Date.now();
  const times = entries
    .map((e) => new Date(e.updatedAt || e.addedAt || 0).getTime())
    .filter((t) => Number.isFinite(t) && t > 0)
    .sort((a, b) => a - b);
  if (!times.length) return Date.now();
  return times[Math.floor(times.length / 2)];
}

function prefsToNames(prefs: PreferenceSignal[], n: number): string[] {
  return prefs
    .filter((p) => p.confidence >= 0.25 && p.score > 0.15)
    .slice(0, n)
    .map((p) => p.value);
}

/**
 * Build a three-chapter taste story from watchlist + lantern memory.
 */
export function buildTasteStory(
  entries: WatchlistEntry[],
  memory?: LanternMemory,
): TasteStory {
  const m = memory || readMemory();
  const prefs = getGenrePreferences(m);
  const mid = medianTime(entries);

  const earlierEntries = entries.filter((e) => {
    const t = new Date(e.addedAt || e.updatedAt || 0).getTime();
    return Number.isFinite(t) && t > 0 && t < mid;
  });
  const laterEntries = entries.filter((e) => {
    const t = new Date(e.updatedAt || e.addedAt || 0).getTime();
    return Number.isFinite(t) && t >= mid;
  });

  const earlierGenres = topFromMap(
    genreCountsFromEntries(earlierEntries, () => true),
    3,
  );
  const currentFromPrefs = prefsToNames(prefs, 4);
  const currentFromShelf = topFromMap(
    genreCountsFromEntries(
      entries.filter(
        (e) =>
          e.watchStatus === "watching" ||
          e.watchStatus === "completed" ||
          e.watchStatus === "planning",
      ),
      () => true,
    ),
    4,
  );
  const currentGenres =
    currentFromPrefs.length >= 2 ? currentFromPrefs : currentFromShelf;

  // Emerging: recent views / filters not already dominant in current
  const recentGenreHits = new Map<string, number>();
  for (const r of m.recentViews.slice(0, 12)) {
    // titles alone don't carry genres — use memory genre counts recent activity proxy via filters
    void r;
  }
  for (const f of m.recentFilters || []) {
    if (f.filter.startsWith("genre:")) {
      const g = f.filter.slice(6);
      recentGenreHits.set(g, (recentGenreHits.get(g) || 0) + 2);
    }
  }
  for (const e of laterEntries) {
    for (const g of e.genres || []) {
      recentGenreHits.set(g, (recentGenreHits.get(g) || 0) + 1);
    }
  }
  const currentSet = new Set(currentGenres);
  const emergingGenres = topFromMap(recentGenreHits, 6)
    .filter((g) => !currentSet.has(g))
    .slice(0, 3);

  const chapters: TasteChapter[] = [];

  // Earlier
  if (earlierGenres.length || m.completedLog.length) {
    const evidence: string[] = [];
    if (earlierEntries.length) {
      evidence.push(
        `${earlierEntries.length} titles added in the earlier half of your shelf timeline`,
      );
    }
    if (m.completedLog.length) {
      evidence.push(
        `Completed log includes “${m.completedLog[m.completedLog.length - 1]?.title || m.completedLog[0].title}”`,
      );
    }
    if (earlierGenres.length) {
      evidence.push(`Genre gravity then: ${earlierGenres.join(", ")}`);
    }
    chapters.push({
      id: "earlier",
      title: "Earlier",
      summary: earlierGenres.length
        ? `Your shelf once leaned ${earlierGenres.slice(0, 2).join(" and ")}.`
        : "Early seals are still sparse — the first chapter is only starting to write itself.",
      genres: earlierGenres,
      evidence,
      confidence: Math.min(0.9, 0.25 + earlierEntries.length * 0.04),
    });
  }

  // Current
  {
    const evidence: string[] = [];
    if (prefs[0]) {
      evidence.push(
        `${prefs[0].value}: confidence ${prefs[0].confidence.toFixed(2)} from ${prefs[0].evidenceCount} signals`,
      );
    }
    if (prefs[1]) {
      evidence.push(
        `${prefs[1].value}: confidence ${prefs[1].confidence.toFixed(2)} from ${prefs[1].evidenceCount} signals`,
      );
    }
    const watching = entries.filter((e) => e.watchStatus === "watching").length;
    if (watching) evidence.push(`${watching} currently watching`);
    const completed = entries.filter((e) => e.watchStatus === "completed").length;
    if (completed) evidence.push(`${completed} completed on shelf`);

    chapters.push({
      id: "current",
      title: "Current",
      summary: currentGenres.length
        ? `Right now the signal sits with ${currentGenres.slice(0, 2).join(" and ")}.`
        : "Add and finish a few titles so the current chapter has weight.",
      genres: currentGenres,
      evidence,
      confidence: prefs[0]?.confidence ?? Math.min(0.7, entries.length * 0.03),
    });
  }

  // Emerging
  if (emergingGenres.length || (m.recentSearches || []).length) {
    const evidence: string[] = [];
    if (emergingGenres.length) {
      evidence.push(`Recent activity surfaces ${emergingGenres.join(", ")}`);
    }
    for (const s of (m.recentSearches || []).slice(0, 2)) {
      evidence.push(`Searched “${s.q}”`);
    }
    if (m.recentViews[0]) {
      evidence.push(`Last opened: “${m.recentViews[0].title}”`);
    }
    chapters.push({
      id: "emerging",
      title: "Emerging",
      summary: emergingGenres.length
        ? `Something new is poking through — ${emergingGenres.slice(0, 2).join(" / ")} is showing up more often.`
        : "Recent searches and opens will shape the next chapter.",
      genres: emergingGenres,
      evidence,
      confidence: Math.min(0.75, 0.2 + emergingGenres.length * 0.15),
    });
  }

  const shifting =
    chapters.length >= 2 &&
    chapters[0].genres[0] &&
    chapters[1].genres[0] &&
    chapters[0].genres[0] !== chapters[1].genres[0];

  const headline = !entries.length
    ? "Your taste story hasn’t started."
    : shifting
      ? "Your taste is changing."
      : entries.length < 8
        ? "Your taste is still forming."
        : "Your taste has a clear through-line.";

  return {
    headline,
    chapters,
    hasEnoughSignal: entries.length >= 3 || prefs.length >= 1,
  };
}
