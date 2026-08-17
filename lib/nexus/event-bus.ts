/**
 * Central behaviour event bus (Sprint 1).
 *
 * Subscribers: memory, rec analytics, lantern, environment, insights, timeline.
 * Emitters must not know who listens.
 */

import type { NexusEvent, NexusEventType } from "./events";

export type NexusEventHandler = (event: NexusEvent) => void;

type Sub = {
  id: number;
  types: Set<NexusEventType> | null;
  handler: NexusEventHandler;
};

let nextId = 1;
const subs: Sub[] = [];

/** Hover must dwell before it becomes a meaningful event. */
const HOVER_DWELL_MS = 500;
const hoverTimers = new Map<number, ReturnType<typeof setTimeout>>();
const lastEmitAt = new Map<string, number>();

function dedupeKey(event: NexusEvent): string {
  switch (event.type) {
    case "anime_viewed":
    case "anime_hovered":
    case "anime_added":
    case "anime_removed":
    case "anime_started":
    case "anime_completed":
    case "anime_dropped":
    case "recommendation_shown":
    case "recommendation_opened":
    case "recommendation_accepted":
    case "recommendation_rejected":
    case "anime_searched":
      return `${event.type}:${event.animeId}`;
    case "search_performed":
      return `${event.type}:${event.query.toLowerCase().trim()}`;
    case "tool_opened":
      return `${event.type}:${event.tool}`;
    case "page_viewed":
      return `${event.type}:${event.path}`;
    default:
      return event.type;
  }
}

const MIN_GAP_MS: Partial<Record<NexusEventType, number>> = {
  anime_viewed: 2_000,
  page_viewed: 1_000,
  search_performed: 800,
  tool_opened: 500,
  lantern_reaction: 3_000,
};

function shouldDropDuplicate(event: NexusEvent): boolean {
  const gap = MIN_GAP_MS[event.type];
  if (gap == null) return false;
  const key = dedupeKey(event);
  const prev = lastEmitAt.get(key) ?? 0;
  const now = Date.now();
  if (now - prev < gap) return true;
  lastEmitAt.set(key, now);
  return false;
}

export function subscribeNexus(
  handler: NexusEventHandler,
  types?: NexusEventType[],
): () => void {
  const id = nextId++;
  subs.push({
    id,
    types: types?.length ? new Set(types) : null,
    handler,
  });
  return () => {
    const i = subs.findIndex((s) => s.id === id);
    if (i >= 0) subs.splice(i, 1);
  };
}

export function emitNexus(event: NexusEvent): void {
  if (typeof window === "undefined") return;
  if (shouldDropDuplicate(event)) return;

  for (const s of subs) {
    if (s.types && !s.types.has(event.type)) continue;
    try {
      s.handler(event);
    } catch (err) {
      console.warn("[NexusEventBus] subscriber error", event.type, err);
    }
  }

  try {
    window.dispatchEvent(
      new CustomEvent("animenexus:nexus", { detail: event }),
    );
  } catch {
    /* ignore */
  }
}

/** Meaningful hover: fires anime_hovered only after dwell. */
export function emitAnimeHoverStart(animeId: number): void {
  if (typeof window === "undefined") return;
  const existing = hoverTimers.get(animeId);
  if (existing) clearTimeout(existing);
  hoverTimers.set(
    animeId,
    setTimeout(() => {
      hoverTimers.delete(animeId);
      emitNexus({ type: "anime_hovered", animeId });
    }, HOVER_DWELL_MS),
  );
}

export function emitAnimeHoverEnd(animeId: number): void {
  const t = hoverTimers.get(animeId);
  if (t) {
    clearTimeout(t);
    hoverTimers.delete(animeId);
  }
}

export function __resetNexusBusForTests(): void {
  subs.length = 0;
  hoverTimers.forEach((t) => clearTimeout(t));
  hoverTimers.clear();
  lastEmitAt.clear();
}
