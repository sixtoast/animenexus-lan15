/**
 * Creative visibility (Sprint 38).
 * Pause Rive / Lottie / R3F / video when off-screen, tab hidden, or inactive.
 */

/** True when the browser tab is visible */
export function isPageVisible(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

/**
 * Subscribe to page visibility. Returns unsubscribe.
 */
export function onPageVisibility(
  cb: (visible: boolean) => void,
): () => void {
  if (typeof document === "undefined") return () => {};
  const handler = () => cb(document.visibilityState === "visible");
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

export type InViewOptions = {
  rootMargin?: string;
  threshold?: number;
  /** If true, stay true after first intersect (one-shot load) */
  once?: boolean;
};

/**
 * Observe element intersection. Safe for SSR (no-op).
 */
export function observeInView(
  el: Element | null,
  cb: (inView: boolean) => void,
  opts: InViewOptions = {},
): () => void {
  if (typeof IntersectionObserver === "undefined" || !el) {
    cb(true);
    return () => {};
  }
  const { rootMargin = "48px", threshold = 0.05, once = false } = opts;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          cb(true);
          if (once) io.disconnect();
        } else if (!once) {
          cb(false);
        }
      }
    },
    { rootMargin, threshold },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Should continuous animation run? */
export function shouldAnimateCreative(opts: {
  inView: boolean;
  pageVisible?: boolean;
  modalOpen?: boolean;
  routeActive?: boolean;
}): boolean {
  const pageVisible = opts.pageVisible ?? isPageVisible();
  const modalOpen = opts.modalOpen ?? true;
  const routeActive = opts.routeActive ?? true;
  return opts.inView && pageVisible && modalOpen && routeActive;
}
