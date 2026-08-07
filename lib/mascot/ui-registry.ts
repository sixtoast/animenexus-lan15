/**
 * UI awareness — landmarks the companion can notice / climb.
 */

export type LandmarkType =
  | "card"
  | "button"
  | "nav"
  | "search"
  | "modal"
  | "rail"
  | "hero"
  | "generic";

export type Landmark = {
  id: string;
  type: LandmarkType;
  priority: number;
  rect: DOMRect | null;
  el: WeakRef<Element> | null;
};

const landmarks = new Map<string, Landmark>();

export function registerLandmark(
  id: string,
  el: Element,
  type: LandmarkType = "generic",
  priority = 1,
) {
  landmarks.set(id, {
    id,
    type,
    priority,
    rect: el.getBoundingClientRect(),
    el: new WeakRef(el),
  });
}

export function unregisterLandmark(id: string) {
  landmarks.delete(id);
}

export function refreshLandmarkRects() {
  for (const lm of landmarks.values()) {
    const el = lm.el?.deref();
    if (!el || !el.isConnected) {
      landmarks.delete(lm.id);
      continue;
    }
    lm.rect = el.getBoundingClientRect();
  }
}

export function listLandmarks(): Landmark[] {
  return [...landmarks.values()].filter((l) => l.rect);
}

export function pickInterestingLandmark(): Landmark | null {
  refreshLandmarkRects();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let best: Landmark | null = null;
  let bestScore = -Infinity;

  for (const lm of landmarks.values()) {
    const r = lm.rect;
    if (!r) continue;
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = Math.hypot(cx - vw / 2, cy - vh / 2);
    const score = lm.priority * 1000 - dist;
    if (score > bestScore) {
      bestScore = score;
      best = lm;
    }
  }
  return best;
}

export function screenToHabitatTarget(
  clientX: number,
  clientY: number,
): { x: number; z: number } {
  const nx = clientX / window.innerWidth;
  const ny = clientY / window.innerHeight;
  const x = (0.5 - nx) * 1.0;
  const z = (0.55 - ny) * 0.45;
  return { x, z };
}

export function landmarkToHabitat(
  lm: Landmark,
): { x: number; z: number } | null {
  if (!lm.rect) return null;
  const cx = lm.rect.left + lm.rect.width / 2;
  const cy = lm.rect.top + lm.rect.height / 2;
  return screenToHabitatTarget(cx, cy);
}

export function scanDomLandmarks() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-mascot-landmark]").forEach((el) => {
    const id =
      el.getAttribute("data-mascot-id") ||
      el.id ||
      `auto-${el.tagName}-${landmarks.size}`;
    const type = (el.getAttribute("data-mascot-landmark") ||
      "generic") as LandmarkType;
    const priority = Number(el.getAttribute("data-mascot-priority") || "1");
    registerLandmark(id, el, type, priority);
  });
}
