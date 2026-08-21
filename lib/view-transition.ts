/**
 * View Transitions + persistent anime object identity (Awwwards Sprint 3).
 * Progressive enhancement — never required for navigation.
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
    return false;
  }
}

export function canViewTransition(): boolean {
  if (typeof document === "undefined") return false;
  if (prefersReducedMotion()) return false;
  return typeof (
    document as Document & { startViewTransition?: unknown }
  ).startViewTransition === "function";
}

/**
 * Canonical shared-element name for an anime poster across surfaces.
 * Browse card → Detail → Watchlist → Oracle / Compare when wired.
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

/**
 * Run a navigation (or any DOM update) inside a View Transition when available.
 * Always invokes `update` — never blocks the action.
 */
export function withViewTransition(update: () => void): void {
  if (!canViewTransition()) {
    update();
    return;
  }
  try {
    const doc = document as Document & {
      startViewTransition: (cb: () => void) => { finished: Promise<void> };
    };
    doc.startViewTransition(() => {
      update();
    });
  } catch {
    update();
  }
}
