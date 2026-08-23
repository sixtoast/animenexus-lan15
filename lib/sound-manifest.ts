/**
 * AnimeNexus Sound Engine — cue registry (Sprints 1 + 16 polish).
 * Prefer files under /audio/ui/*.wav; engine falls back to bundled PCM if missing.
 */

export type SoundCategory =
  | "ui"
  | "navigation"
  | "object"
  | "lantern"
  | "tool"
  | "celebration";

export type SoundCueId =
  | "ui_tap"
  | "nav_tick"
  | "menu_open"
  | "menu_close"
  | "filter_select"
  | "seal"
  | "remove"
  | "progress_up"
  | "progress_down"
  | "complete"
  | "error"
  | "success"
  | "oracle_tune"
  | "radar_ping"
  | "challenge_ok"
  | "challenge_bad"
  | "memory_focus"
  | "shelf_settle"
  | "resonance"
  | "modal_open"
  | "modal_close"
  | "signal_acquired";

export type SoundCueDef = {
  id: SoundCueId;
  category: SoundCategory;
  /** Path under public/ */
  src: string;
  /** Default gain 0–1 before category/master */
  gain?: number;
  /** Min ms between plays of this cue */
  cooldownMs?: number;
};

export const SOUND_CUES: Record<SoundCueId, SoundCueDef> = {
  ui_tap: {
    id: "ui_tap",
    category: "ui",
    src: "/audio/ui/ui_tap.wav",
    gain: 0.28,
    cooldownMs: 50,
  },
  nav_tick: {
    id: "nav_tick",
    category: "navigation",
    src: "/audio/ui/nav_tick.wav",
    gain: 0.22,
    cooldownMs: 100,
  },
  menu_open: {
    id: "menu_open",
    category: "navigation",
    src: "/audio/ui/menu_open.wav",
    gain: 0.32,
    cooldownMs: 220,
  },
  menu_close: {
    id: "menu_close",
    category: "navigation",
    src: "/audio/ui/menu_close.wav",
    gain: 0.28,
    cooldownMs: 220,
  },
  filter_select: {
    id: "filter_select",
    category: "ui",
    src: "/audio/ui/filter_select.wav",
    gain: 0.3,
    cooldownMs: 120,
  },
  seal: {
    id: "seal",
    category: "object",
    src: "/audio/ui/seal.wav",
    gain: 0.48,
    cooldownMs: 450,
  },
  remove: {
    id: "remove",
    category: "object",
    src: "/audio/ui/remove.wav",
    gain: 0.36,
    cooldownMs: 280,
  },
  progress_up: {
    id: "progress_up",
    category: "object",
    src: "/audio/ui/progress_up.wav",
    gain: 0.24,
    cooldownMs: 80,
  },
  progress_down: {
    id: "progress_down",
    category: "object",
    src: "/audio/ui/progress_down.wav",
    gain: 0.22,
    cooldownMs: 80,
  },
  complete: {
    id: "complete",
    category: "celebration",
    src: "/audio/ui/complete.wav",
    gain: 0.42,
    cooldownMs: 700,
  },
  error: {
    id: "error",
    category: "ui",
    src: "/audio/ui/error.wav",
    gain: 0.36,
    cooldownMs: 350,
  },
  success: {
    id: "success",
    category: "ui",
    src: "/audio/ui/success.wav",
    gain: 0.34,
    cooldownMs: 280,
  },
  oracle_tune: {
    id: "oracle_tune",
    category: "tool",
    src: "/audio/ui/oracle_tune.wav",
    gain: 0.36,
    cooldownMs: 450,
  },
  radar_ping: {
    id: "radar_ping",
    category: "tool",
    src: "/audio/ui/radar_ping.wav",
    gain: 0.22,
    cooldownMs: 100,
  },
  challenge_ok: {
    id: "challenge_ok",
    category: "tool",
    src: "/audio/ui/challenge_ok.wav",
    gain: 0.4,
    cooldownMs: 220,
  },
  challenge_bad: {
    id: "challenge_bad",
    category: "tool",
    src: "/audio/ui/challenge_bad.wav",
    gain: 0.36,
    cooldownMs: 220,
  },
  memory_focus: {
    id: "memory_focus",
    category: "lantern",
    src: "/audio/ui/memory_focus.wav",
    gain: 0.3,
    cooldownMs: 350,
  },
  shelf_settle: {
    id: "shelf_settle",
    category: "object",
    src: "/audio/ui/shelf_settle.wav",
    gain: 0.22,
    cooldownMs: 150,
  },
  resonance: {
    id: "resonance",
    category: "object",
    src: "/audio/ui/resonance.wav",
    gain: 0.36,
    cooldownMs: 450,
  },
  modal_open: {
    id: "modal_open",
    category: "navigation",
    src: "/audio/ui/modal_open.wav",
    gain: 0.3,
    cooldownMs: 220,
  },
  modal_close: {
    id: "modal_close",
    category: "navigation",
    src: "/audio/ui/modal_close.wav",
    gain: 0.26,
    cooldownMs: 220,
  },
  signal_acquired: {
    id: "signal_acquired",
    category: "tool",
    src: "/audio/ui/signal_acquired.wav",
    gain: 0.32,
    cooldownMs: 900,
  },
};

/** Cues preloaded after unlock */
export const PRELOAD_CUES: SoundCueId[] = [
  "ui_tap",
  "nav_tick",
  "filter_select",
  "error",
  "success",
  "seal",
  "complete",
  "menu_open",
  "menu_close",
];

export const SOUND_PREF_KEY = "anime_nexus_sound";

export type SoundPrefs = {
  /** Master enabled — default off until user opts in */
  enabled: boolean;
  master: number;
  ui: number;
  navigation: number;
  object: number;
  lantern: number;
  tool: number;
  celebration: number;
};

export const DEFAULT_SOUND_PREFS: SoundPrefs = {
  enabled: false,
  master: 0.4,
  ui: 1,
  navigation: 0.9,
  object: 1,
  lantern: 0.8,
  tool: 0.95,
  celebration: 0.9,
};
