/**
 * Global environment engine (Sprint 6).
 * One conceptual state → subtle ambient outputs.
 * No Sakura. Does not force full theme swaps.
 */

export type TimeOfDay =
  | "late-night"
  | "morning"
  | "afternoon"
  | "evening";

export type AmbientIntensity = "low" | "medium" | "high";
export type AccentTemperature = "cool" | "neutral" | "warm";
export type MotionIntensity = "still" | "soft" | "full";
export type LanternMoodHint =
  | "relaxed"
  | "curious"
  | "focused"
  | "celebratory"
  | "concerned";

export type NexusEnvironment = {
  timeOfDay: TimeOfDay;
  route: string;
  routeKind:
    | "home"
    | "browse"
    | "detail"
    | "watchlist"
    | "tool"
    | "taste"
    | "other";
  reducedMotion: boolean;
  /** 0–1 activity from recent events (soft). */
  activity: number;
  intensity: AmbientIntensity;
  accent: AccentTemperature;
  motion: MotionIntensity;
  lanternMood: LanternMoodHint;
  /** Optional current anime id on detail routes */
  animeId: number | null;
};

export function timeOfDayFromHour(h: number): TimeOfDay {
  if (h < 5) return "late-night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "late-night";
}

export function routeKindFromPath(path: string): NexusEnvironment["routeKind"] {
  if (path === "/" || path === "") return "home";
  if (path.startsWith("/browse")) return "browse";
  if (path.startsWith("/anime/")) return "detail";
  if (path.startsWith("/watchlist")) return "watchlist";
  if (path.startsWith("/taste")) return "taste";
  if (path.startsWith("/tools")) return "tool";
  return "other";
}

export function animeIdFromPath(path: string): number | null {
  const m = path.match(/^\/anime\/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function deriveEnvironment(input: {
  hour?: number;
  path?: string;
  reducedMotion?: boolean;
  activity?: number;
}): NexusEnvironment {
  const hour = input.hour ?? new Date().getHours();
  const path = input.path ?? "/";
  const reduced =
    input.reducedMotion ??
    (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const activity = Math.max(0, Math.min(1, input.activity ?? 0.25));
  const timeOfDay = timeOfDayFromHour(hour);
  const routeKind = routeKindFromPath(path);
  const animeId = animeIdFromPath(path);

  let intensity: AmbientIntensity = "medium";
  let accent: AccentTemperature = "neutral";
  let motion: MotionIntensity = reduced ? "still" : "soft";
  let lanternMood: LanternMoodHint = "curious";

  // Time of day
  if (timeOfDay === "late-night") {
    intensity = "low";
    accent = "warm";
    lanternMood = "relaxed";
    if (!reduced) motion = "soft";
  } else if (timeOfDay === "morning") {
    intensity = "medium";
    accent = "cool";
    lanternMood = "curious";
  } else if (timeOfDay === "evening") {
    intensity = "medium";
    accent = "warm";
    lanternMood = "focused";
  }

  // Route
  if (routeKind === "tool") {
    intensity = intensity === "low" ? "medium" : "high";
    lanternMood = "focused";
    if (!reduced) motion = "full";
  } else if (routeKind === "detail") {
    lanternMood = "curious";
  } else if (routeKind === "watchlist") {
    lanternMood = "focused";
  } else if (routeKind === "home") {
    if (timeOfDay === "late-night") lanternMood = "relaxed";
  }

  // Activity boost (subtle)
  if (activity > 0.7 && !reduced) {
    if (intensity === "low") intensity = "medium";
    else if (intensity === "medium") intensity = "high";
  }

  if (reduced) {
    motion = "still";
    if (intensity === "high") intensity = "medium";
  }

  return {
    timeOfDay,
    route: path,
    routeKind,
    reducedMotion: reduced,
    activity,
    intensity,
    accent,
    motion,
    lanternMood,
    animeId,
  };
}

/** Apply environment to <html> dataset for CSS / mascot consumers. */
export function applyEnvironmentToDocument(env: NexusEnvironment): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.tod = env.timeOfDay;
  root.dataset.nxRoute = env.routeKind;
  root.dataset.nxIntensity = env.intensity;
  root.dataset.nxAccent = env.accent;
  root.dataset.nxMotion = env.motion;
  root.dataset.nxLantern = env.lanternMood;
  if (env.animeId != null) root.dataset.nxAnime = String(env.animeId);
  else delete root.dataset.nxAnime;
}
