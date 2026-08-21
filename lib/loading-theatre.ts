/**
 * Loading Theatre — honest, route-aware waits (Awwwards Sprint 13).
 * No fake progress percentages. Calm vocabulary only.
 */

export const LOADING_COPY = {
  default: "Tuning the frequency…",
  search: "Scanning the catalogue…",
  recommendations: "Reading your signal…",
  radar: "Scanning the horizon…",
  oracle: "Tuning the desk…",
  ai: "Lantern is thinking…",
  ancestry: "Tracing connections…",
  sauce: "Tracing the frame…",
  challenge: "Drawing a challenge…",
  fusion: "Weaving the signal…",
  browse: "Scanning the catalogue…",
  detail: "Opening the dossier…",
  watchlist: "Staging the shelf…",
  journey: "Opening the archive…",
  taste: "Reading the profile…",
  seasonal: "Checking the season…",
  daily: "Preparing today’s signal…",
  tools: "Clearing the desk…",
  home: "Warming the signal…",
} as const;

export type LoadingContext = keyof typeof LOADING_COPY;

export function loadingLabel(
  context?: LoadingContext | string | null,
): string {
  if (!context) return LOADING_COPY.default;
  if (context in LOADING_COPY) {
    return LOADING_COPY[context as LoadingContext];
  }
  return context;
}

/** Map pathname → theatre context (best-effort). */
export function contextFromPath(pathname: string | null | undefined): LoadingContext {
  if (!pathname) return "default";
  if (pathname === "/") return "home";
  if (pathname.startsWith("/browse")) return "browse";
  if (pathname.startsWith("/anime/")) return "detail";
  if (pathname.startsWith("/watchlist")) return "watchlist";
  if (pathname.startsWith("/journey")) return "journey";
  if (pathname.startsWith("/taste")) return "taste";
  if (pathname.startsWith("/seasonal")) return "seasonal";
  if (pathname.startsWith("/daily")) return "daily";
  if (pathname.startsWith("/tools/oracle")) return "oracle";
  if (pathname.startsWith("/tools/radar")) return "radar";
  if (pathname.startsWith("/tools/ai") || pathname.startsWith("/tools/chat"))
    return "ai";
  if (pathname.startsWith("/tools/ancestry")) return "ancestry";
  if (pathname.startsWith("/tools")) return "tools";
  return "default";
}
