/**
 * View Transitions + persistent anime object identity (Awwwards Sprints 3 + 14).
 * Creative Sprint 10: mark route + soft-fail always.
 *
 * Contract:
 * - Progressive enhancement only — navigation never requires VT
 * - Shared name: cover-{animeId} on card, shelf, detail hero
 * - Reduced motion / missing API → immediate update, no mid-state lock
 */

export function prefersReducedMotion(): boolean {
  if (typeof document === "undefined") return true;
  if (document.documentElement.getAttribute("data-reduce-motion") === "true") {
    return true;
  }
  if (document.documentElement.getAttribute("data-motion") === "full") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

export function canViewTransition(): boolean {
  if (typeof document === "undefined") return false;
  if (prefersReducedMotion()) return false;
  return (
    typeof (
      document as Document & { startViewTransition?: unknown }
    ).startViewTransition === "function"
  );
}

/**
 * Canonical shared-element name for an anime poster across surfaces.
 * Browse card → Detail → Watchlist shelf → Memory (when image present).
 */
export function getAnimeViewTransitionName(
  animeId: string | number,
): string {
  return `cover-${animeId}`;
}

/** Semantic object id for cinematography / mascot / shelf mapping. */
export function getAnimeObjectId(animeId: string | number): string {
  return String(animeId);
}

/** Optional: mark document for CSS that skips competing room-enter. */
export type MotionRoute =
  | "anime-detail"
  | "search"
  | "franchise"
  | "watchlist"
  | "generic";

export type MotionOrigin = "card" | "node" | "field" | "search" | "watchlist" | "nav" | "unknown";

export type MotionDestination = "hero" | "results" | "graph" | "constellation" | "detail" | "unknown";

export type MotionScene = {
  route?: MotionRoute;
  origin?: MotionOrigin;
  destination?: MotionDestination;
  objectId?: string;
};

let activeScene: MotionScene | null = null;

export function readMotionScene(): MotionScene | null {
  return activeScene;
}

export function markMotionScene(scene: MotionScene): void {
  activeScene = scene;
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.motionRoute = scene.route || "generic";
  root.dataset.motionOrigin = scene.origin || "unknown";
  root.dataset.motionDestination = scene.destination || "unknown";
  if (scene.objectId) root.dataset.motionObject = scene.objectId;
}

export function clearMotionScene(): void {
  activeScene = null;
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  delete root.dataset.motionRoute;
  delete root.dataset.motionOrigin;
  delete root.dataset.motionDestination;
  delete root.dataset.motionObject;
}

export function markViewTransitionRoute(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("room-enter-vt");
  window.setTimeout(() => {
    document.documentElement.classList.remove("room-enter-vt");
  }, 600);
}

/**
 * Run a navigation (or any DOM update) inside a View Transition when available.
 * Always invokes `update` — never blocks the action.
 */
export function withViewTransition(update: () => void, scene: MotionScene = {}): void {
  markMotionScene(scene);
  if (!canViewTransition()) {
    update();
    window.setTimeout(clearMotionScene, 80);
    return;
  }
  try {
    markViewTransitionRoute();
    const doc = document as Document & {
      startViewTransition: (cb: () => void) => { finished: Promise<void> };
    };
    const transition = doc.startViewTransition(() => {
      update();
    });
    transition.finished.finally(clearMotionScene);
  } catch {
    update();
    window.setTimeout(clearMotionScene, 80);
  }
}
