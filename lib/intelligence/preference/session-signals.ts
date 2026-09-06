/**
 * Session behaviour → sessionAnime for UserPreferenceVector.
 * Detail opens / rec opens of titles not on the shelf influence current intent.
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  getBehaviourSessionId,
  readBehaviourEvents,
  type BehaviourEvent,
  type BehaviourKind,
} from "@/lib/behaviour-events";
import {
  entryToAnime,
  getCatalogueEntry,
} from "@/lib/intelligence/items/fingerprint-catalogue";

const SESSION_KINDS: BehaviourKind[] = [
  "detail_open",
  "detail_revisit",
  "rec_open",
  "rec_accept",
  "hover",
  "exposure",
];

const WEIGHT_BY_KIND: Partial<Record<BehaviourKind, number>> = {
  detail_revisit: 1.4,
  detail_open: 1.0,
  rec_accept: 1.2,
  rec_open: 0.9,
  hover: 0.35,
  exposure: 0.25,
};

export type SessionSignal = {
  animeId: number;
  weight: number;
  kinds: BehaviourKind[];
};

function currentSessionId(): string {
  try {
    return getBehaviourSessionId() || "";
  } catch {
    return "";
  }
}

export function collectSessionSignals(opts?: {
  sinceMs?: number;
  maxIds?: number;
  excludeIds?: Set<number> | number[];
}): SessionSignal[] {
  const sinceMs = opts?.sinceMs ?? 2 * 60 * 60 * 1000;
  const maxIds = opts?.maxIds ?? 24;
  const exclude = new Set(
    opts?.excludeIds
      ? Array.isArray(opts.excludeIds)
        ? opts.excludeIds
        : [...opts.excludeIds]
      : [],
  );

  let events: BehaviourEvent[] = [];
  try {
    events = readBehaviourEvents({ sinceMs, kinds: SESSION_KINDS });
  } catch {
    return [];
  }

  const sid = currentSessionId();
  if (sid) {
    const scoped = events.filter((e) => e.sessionId === sid);
    if (scoped.length >= 2) events = scoped;
  }

  const bag = new Map<
    number,
    { weight: number; kinds: Set<BehaviourKind> }
  >();

  for (const ev of events) {
    if (!ev.animeId || exclude.has(ev.animeId)) continue;
    const w = WEIGHT_BY_KIND[ev.kind] ?? 0.2;
    let boost = 1;
    if (ev.kind === "exposure" && (ev.meta?.visibleMs ?? 0) >= 4000) {
      boost = 1.5;
    }
    if (ev.kind === "hover" && (ev.meta?.visibleMs ?? 0) < 800) continue;

    const prev = bag.get(ev.animeId) || { weight: 0, kinds: new Set() };
    prev.weight += w * boost;
    prev.kinds.add(ev.kind);
    bag.set(ev.animeId, prev);
  }

  return [...bag.entries()]
    .map(([animeId, v]) => ({
      animeId,
      weight: v.weight,
      kinds: [...v.kinds],
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxIds);
}

function stubFromId(id: number, entries: WatchlistEntry[]): Anime | null {
  const shelf = entries.find((e) => e.id === id);
  if (shelf) {
    return {
      id: shelf.id,
      title: shelf.title,
      description: "",
      genre: (shelf.genres || shelf.tags || [])[0] || "",
      tags: shelf.genres || shelf.tags || [],
      status: "FINISHED",
      format: (shelf.format as Anime["format"]) || "TV",
      year: shelf.year || "",
      score: shelf.score || 0,
      popularity: 0,
      image: shelf.image,
      anilist_id: shelf.id,
      episodes: shelf.episodes ?? "",
      duration: shelf.duration || 24,
    };
  }
  const cat = getCatalogueEntry(id);
  if (cat) return entryToAnime(cat);
  return null;
}

export function resolveSessionAnime(
  entries: WatchlistEntry[],
  opts?: {
    sinceMs?: number;
    max?: number;
    includeShelf?: boolean;
  },
): Anime[] {
  const shelfIds = new Set(entries.map((e) => e.id));
  const includeShelf = opts?.includeShelf !== false;
  const signals = collectSessionSignals({
    sinceMs: opts?.sinceMs,
    maxIds: (opts?.max ?? 16) * 2,
    excludeIds: includeShelf ? [] : [...shelfIds],
  });

  const out: Anime[] = [];
  const seen = new Set<number>();
  for (const s of signals) {
    if (seen.has(s.animeId)) continue;
    if (!includeShelf && shelfIds.has(s.animeId)) continue;
    const a = stubFromId(s.animeId, entries);
    if (!a) continue;
    if (
      s.weight < 0.5 &&
      !s.kinds.some((k) =>
        ["detail_open", "detail_revisit", "rec_open", "rec_accept"].includes(
          k,
        ),
      )
    ) {
      continue;
    }
    seen.add(s.animeId);
    out.push(a);
    if (out.length >= (opts?.max ?? 12)) break;
  }

  out.sort((a, b) => {
    const as = shelfIds.has(a.id) ? 1 : 0;
    const bs = shelfIds.has(b.id) ? 1 : 0;
    return as - bs;
  });
  return out;
}

export function withSessionAnime(
  entries: WatchlistEntry[],
  explicit?: Anime[],
): Anime[] {
  const fromBehaviour = resolveSessionAnime(entries, { max: 12 });
  if (!explicit?.length) return fromBehaviour;
  const seen = new Set(explicit.map((a) => a.id));
  const merged = [...explicit];
  for (const a of fromBehaviour) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    merged.push(a);
    if (merged.length >= 16) break;
  }
  return merged;
}
