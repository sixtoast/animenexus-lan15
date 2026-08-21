/**
 * Memory Room data architecture (Awwwards Sprint 8).
 * Enriches existing journey events — does not invent personal emotion.
 * "Significance within your AnimeNexus history" only.
 */

import type { WatchlistEntry } from "./types";
import type { LanternMemory } from "./lantern-memory";
import { buildJourney, type JourneyEvent } from "./journey";
import { userResonance, topResonanceDims, resonanceLabel } from "./resonance";

export type MemoryChapterId =
  | "first_light"
  | "exploration"
  | "focus"
  | "slower_turn"
  | "current_signal";

export type MemoryChapter = {
  id: MemoryChapterId;
  title: string;
  summary: string;
  eventIds: string[];
};

export type MemoryEvent = JourneyEvent & {
  /** 0–1 significance within AnimeNexus history (not life importance) */
  importance: number;
  chapter?: MemoryChapterId;
  animeIds?: number[];
  resonanceNote?: string;
};

function extractAnimeIds(e: JourneyEvent): number[] {
  if (e.href?.startsWith("/anime/")) {
    const n = parseInt(e.href.replace("/anime/", ""), 10);
    if (Number.isFinite(n)) return [n];
  }
  return [];
}

function scoreImportance(e: JourneyEvent, entries: WatchlistEntry[]): number {
  let s = 0.25;
  switch (e.kind) {
    case "first_seen":
      s = 0.95;
      break;
    case "first_seal":
      s = 0.9;
      break;
    case "completion":
      s = 0.72;
      break;
    case "taste_chapter":
      s = 0.68;
      break;
    case "genre_shift":
      s = 0.55;
      break;
    case "rec_accept":
      s = 0.5;
      break;
    case "visit_streak":
      s = 0.4;
      break;
    case "tool":
      s = 0.28;
      break;
    case "session":
      s = 0.22;
      break;
    case "observation":
      s = 0.45;
      break;
    default:
      s = 0.3;
  }
  // Boost completion if highly rated on shelf
  if (e.kind === "completion") {
    const ids = extractAnimeIds(e);
    const ent = entries.find((x) => ids.includes(x.id));
    if (ent && ent.userRating >= 8) s = Math.min(1, s + 0.15);
  }
  if (e.kind === "first_seal" && entries.length >= 8) {
    s = Math.min(1, s + 0.05);
  }
  return Math.max(0.1, Math.min(1, s));
}

function assignChapter(e: JourneyEvent): MemoryChapterId {
  switch (e.kind) {
    case "first_seen":
    case "first_seal":
      return "first_light";
    case "tool":
    case "session":
    case "visit_streak":
      return "exploration";
    case "completion":
    case "rec_accept":
      return "focus";
    case "taste_chapter":
    case "genre_shift":
      return "slower_turn";
    case "observation":
    default:
      return "current_signal";
  }
}

const CHAPTER_META: Record<
  MemoryChapterId,
  { title: string; fallback: string }
> = {
  first_light: {
    title: "First Light",
    fallback: "The desk opened and the first titles were sealed.",
  },
  exploration: {
    title: "Exploration",
    fallback: "Sessions, tools, and return visits expanded the map.",
  },
  focus: {
    title: "The Focus Phase",
    fallback: "Completions and accepted recommendations deepened the shelf.",
  },
  slower_turn: {
    title: "A Slower Turn",
    fallback: "Taste chapters and genre signals shifted the model’s weight.",
  },
  current_signal: {
    title: "Current Signal",
    fallback: "What the desk observes in your shelf right now.",
  },
};

/** Enrich journey events with importance + chapter tags. */
export function buildMemoryEvents(
  entries: WatchlistEntry[],
  memory?: LanternMemory,
): MemoryEvent[] {
  const base = buildJourney(entries, memory);
  const res = entries.length >= 2 ? userResonance(entries) : null;
  const top = res ? topResonanceDims(res, 2) : [];
  const resNote =
    top.length > 0
      ? `Model frequencies: ${top.map((t) => resonanceLabel(t.dim)).join(", ")}.`
      : undefined;

  return base.map((e) => {
    const importance = scoreImportance(e, entries);
    const chapter = assignChapter(e);
    const animeIds = extractAnimeIds(e);
    return {
      ...e,
      importance,
      chapter,
      animeIds: animeIds.length ? animeIds : undefined,
      resonanceNote:
        e.kind === "observation" || e.kind === "taste_chapter"
          ? resNote
          : undefined,
    };
  });
}

/** Group memory events into conservative chapters. */
export function buildMemoryChapters(events: MemoryEvent[]): MemoryChapter[] {
  const order: MemoryChapterId[] = [
    "first_light",
    "exploration",
    "focus",
    "slower_turn",
    "current_signal",
  ];
  const by: Record<MemoryChapterId, MemoryEvent[]> = {
    first_light: [],
    exploration: [],
    focus: [],
    slower_turn: [],
    current_signal: [],
  };
  for (const e of events) {
    const c = e.chapter ?? "current_signal";
    by[c].push(e);
  }

  const chapters: MemoryChapter[] = [];
  for (const id of order) {
    const list = by[id];
    if (!list.length) continue;
    const meta = CHAPTER_META[id];
    const top = [...list].sort((a, b) => b.importance - a.importance)[0];
    chapters.push({
      id,
      title: meta.title,
      summary: top?.body || meta.fallback,
      eventIds: list.map((e) => e.id),
    });
  }
  return chapters;
}

export type MemoryRoomModel = {
  events: MemoryEvent[];
  chapters: MemoryChapter[];
};

export function buildMemoryRoom(
  entries: WatchlistEntry[],
  memory?: LanternMemory,
): MemoryRoomModel {
  const events = buildMemoryEvents(entries, memory);
  const chapters = buildMemoryChapters(events);
  return { events, chapters };
}
