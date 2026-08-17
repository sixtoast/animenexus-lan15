/**
 * Quiet memory subscriber (Sprint 1 → 2 bridge).
 * Listens to Nexus events; does not invent UI or network traffic.
 * anime_viewed / anime_completed are already handled by existing writers
 * (MemoryVisit, WatchlistProvider) to avoid double-counting.
 */

import { subscribeNexus } from "./event-bus";
import type { NexusEvent } from "./events";
import {
  noteSearchQuery,
  noteFilterUsed,
  noteToolOpened,
  noteRecommendationSignal,
  noteWatchlistSignal,
} from "@/lib/lantern-memory";

let unsub: (() => void) | null = null;

function onEvent(event: NexusEvent): void {
  switch (event.type) {
    case "search_performed":
      noteSearchQuery(event.query);
      break;
    case "filter_used":
      noteFilterUsed(event.filter);
      break;
    case "tool_opened":
      noteToolOpened(event.tool);
      break;
    case "recommendation_shown":
    case "recommendation_opened":
    case "recommendation_accepted":
    case "recommendation_rejected":
      noteRecommendationSignal(event.type, event.animeId);
      break;
    case "anime_added":
      noteWatchlistSignal("added", event.animeId);
      break;
    case "anime_removed":
      noteWatchlistSignal("removed", event.animeId);
      break;
    case "anime_started":
      noteWatchlistSignal("started", event.animeId);
      break;
    case "anime_dropped":
      noteWatchlistSignal("dropped", event.animeId);
      break;
    default:
      break;
  }
}

/** Idempotent — safe to call from LanternMemoryBoot. */
export function installMemorySubscriber(): void {
  if (typeof window === "undefined") return;
  if (unsub) return;
  unsub = subscribeNexus(onEvent);
}

export function uninstallMemorySubscriber(): void {
  unsub?.();
  unsub = null;
}
