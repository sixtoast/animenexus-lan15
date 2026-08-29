/**
 * Media / creative performance budgets (Creative Sprint 37).
 * Measurable limits — do not load tool-stage creative on Home.
 */

export type MediaRoute =
  | "home"
  | "browse"
  | "detail"
  | "watchlist"
  | "tools"
  | "radar"
  | "oracle"
  | "challenge"
  | "sauce"
  | "other";

export type MediaBudget = {
  route: MediaRoute;
  /** Max concurrent Rive instances intentional for this route */
  maxRive: number;
  /** Max Lottie/dotLottie players */
  maxLottie: number;
  /** Allow R3F shelf / heavy scene */
  allowR3fShelf: boolean;
  /** Preload UI SFX count (engine still opt-in) */
  audioPreloadMax: number;
  /** Cloudinary delivery width ceiling for cards */
  cloudinaryMaxWidth: number;
  /** Priority (eager) images */
  maxPriorityImages: number;
};

const BUDGETS: Record<MediaRoute, MediaBudget> = {
  home: {
    route: "home",
    maxRive: 0,
    maxLottie: 1,
    allowR3fShelf: false,
    audioPreloadMax: 4,
    cloudinaryMaxWidth: 480,
    maxPriorityImages: 4,
  },
  browse: {
    route: "browse",
    maxRive: 0,
    maxLottie: 0,
    allowR3fShelf: false,
    audioPreloadMax: 6,
    cloudinaryMaxWidth: 400,
    maxPriorityImages: 6,
  },
  detail: {
    route: "detail",
    maxRive: 1,
    maxLottie: 1,
    allowR3fShelf: false,
    audioPreloadMax: 6,
    cloudinaryMaxWidth: 720,
    maxPriorityImages: 2,
  },
  watchlist: {
    route: "watchlist",
    maxRive: 0,
    maxLottie: 0,
    allowR3fShelf: true,
    audioPreloadMax: 8,
    cloudinaryMaxWidth: 360,
    maxPriorityImages: 4,
  },
  tools: {
    route: "tools",
    maxRive: 1,
    maxLottie: 1,
    allowR3fShelf: false,
    audioPreloadMax: 8,
    cloudinaryMaxWidth: 480,
    maxPriorityImages: 2,
  },
  radar: {
    route: "radar",
    maxRive: 1,
    maxLottie: 0,
    allowR3fShelf: false,
    audioPreloadMax: 8,
    cloudinaryMaxWidth: 320,
    maxPriorityImages: 2,
  },
  oracle: {
    route: "oracle",
    maxRive: 1,
    maxLottie: 0,
    allowR3fShelf: false,
    audioPreloadMax: 8,
    cloudinaryMaxWidth: 320,
    maxPriorityImages: 2,
  },
  challenge: {
    route: "challenge",
    maxRive: 0,
    maxLottie: 1,
    allowR3fShelf: false,
    audioPreloadMax: 6,
    cloudinaryMaxWidth: 480,
    maxPriorityImages: 1,
  },
  sauce: {
    route: "sauce",
    maxRive: 0,
    maxLottie: 0,
    allowR3fShelf: false,
    audioPreloadMax: 4,
    cloudinaryMaxWidth: 640,
    maxPriorityImages: 1,
  },
  other: {
    route: "other",
    maxRive: 1,
    maxLottie: 1,
    allowR3fShelf: false,
    audioPreloadMax: 6,
    cloudinaryMaxWidth: 480,
    maxPriorityImages: 3,
  },
};

export function mediaBudgetFor(route: MediaRoute): MediaBudget {
  return BUDGETS[route] ?? BUDGETS.other;
}

/** Heuristic from pathname */
export function mediaRouteFromPath(pathname: string): MediaRoute {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/browse")) return "browse";
  if (pathname.startsWith("/anime/")) return "detail";
  if (pathname.startsWith("/watchlist")) return "watchlist";
  if (pathname.includes("/radar")) return "radar";
  if (pathname.includes("/oracle")) return "oracle";
  if (pathname.includes("/challenge")) return "challenge";
  if (pathname.includes("/sauce")) return "sauce";
  if (pathname.startsWith("/tools")) return "tools";
  return "other";
}

/** Soft limits for audits (bytes / counts) */
export const GLOBAL_MEDIA_CAPS = {
  /** Sum of preloaded WAV targets */
  audioPreloadBytesSoft: 180_000,
  /** Single Lottie/dotLottie preferred max */
  lottieBytesSoft: 120_000,
  /** Rive .riv preferred max */
  riveBytesSoft: 200_000,
  /** Self-hosted icon SVG bundle soft */
  iconBundleBytesSoft: 80_000,
} as const;
