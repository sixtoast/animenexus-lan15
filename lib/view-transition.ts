/**
 * View Transitions helper (master plan · Sprint 18).
 * Respects reduced motion / data-reduce-motion; falls back to plain navigate.
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
