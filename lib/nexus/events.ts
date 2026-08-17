/**
 * AnimeNexus behaviour event vocabulary (Sprint 1).
 * Components emit these; they must not invent ad-hoc event shapes.
 */

export type NexusEvent =
  | { type: "anime_viewed"; animeId: number; title?: string }
  | { type: "anime_hovered"; animeId: number }
  | { type: "anime_searched"; animeId: number }
  | { type: "anime_added"; animeId: number; title?: string }
  | { type: "anime_removed"; animeId: number }
  | { type: "anime_started"; animeId: number }
  | { type: "anime_completed"; animeId: number; title?: string }
  | { type: "anime_dropped"; animeId: number }
  | { type: "recommendation_shown"; animeId: number }
  | { type: "recommendation_opened"; animeId: number }
  | { type: "recommendation_accepted"; animeId: number }
  | { type: "recommendation_rejected"; animeId: number; reason?: string }
  | { type: "tool_opened"; tool: string }
  | { type: "session_started"; mode: string }
  | { type: "session_ended"; mode: string }
  | { type: "search_performed"; query: string }
  | { type: "filter_used"; filter: string }
  | { type: "lantern_reaction"; reaction: string }
  | { type: "page_viewed"; path: string };

export type NexusEventType = NexusEvent["type"];

export type NexusEventOf<T extends NexusEventType> = Extract<
  NexusEvent,
  { type: T }
>;
