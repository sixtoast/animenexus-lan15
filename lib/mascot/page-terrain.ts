/**
 * Map the live page into walkable platforms (canonical page world x/y).
 * Closed overlays are never treated as climbable modals.
 */

import {
  listLandmarks,
  refreshLandmarkRects,
  scanDomLandmarks,
  registerLandmark,
  type Landmark,
  type LandmarkType,
} from "./ui-registry";
import {
  domRectToWorld,
  screenToWorld,
  worldToScreen,
} from "./world-coords";

export type TerrainPlatform = {
  id: string;
  type: string;
  x: number;
  y: number;
  hw: number;
  hh: number;
  priority: number;
  clientX: number;
  clientY: number;
};

// Re-export canonical conversions so callers import from one place
export { screenToWorld, worldToScreen, domRectToWorld };

export function nearestPlatform(
  platforms: TerrainPlatform[],
  x: number,
  y: number,
): TerrainPlatform | null {
  if (!platforms.length) return null;
  let best: TerrainPlatform | null = null;
  let bestDist = Infinity;
  for (const p of platforms) {
    const top = p.y + p.hh;
    const dx = Math.max(Math.abs(x - p.x) - p.hw, 0);
    const dy = y - top;
    const d = Math.hypot(dx, dy * 0.6);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function rectToPlatformFromDom(
  id: string,
  type: string,
  r: DOMRect,
  priority: number,
): TerrainPlatform | null {
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  if (r.width < 10 || r.height < 10) return null;
  if (r.bottom < 40 || r.top > vh - 40 || r.right < 40 || r.left > vw - 40)
    return null;

  const mapped = domRectToWorld(r);
  if (!mapped) return null;

  return {
    id,
    type,
    x: mapped.center.x,
    y: mapped.center.y,
    hw: mapped.hw,
    hh: mapped.hh,
    priority,
    clientX: mapped.clientX,
    clientY: mapped.clientY,
  };
}

export function rectToPlatform(
  lm: Landmark,
  _scrollY: number,
): TerrainPlatform | null {
  if (!lm.rect) return null;
  return rectToPlatformFromDom(lm.id, lm.type, lm.rect, lm.priority);
}

function isOpenOverlay(el: Element): boolean {
  if (el.hasAttribute("hidden")) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.classList.contains("open")) return true;
  if (el.getAttribute("data-open") === "true") return true;
  if (el.getAttribute("role") === "dialog") {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  }
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

export function ensureFloorAndHome(): void {
  if (typeof window === "undefined") return;
  const vh = window.innerHeight || 800;
  const vw = window.innerWidth || 1200;
  const floor = screenToWorld(vw / 2, vh - 8);
  registerLandmark({
    id: "floor-band",
    type: "floor",
    priority: 1,
    climbable: true,
    interactive: false,
    open: true,
    rect: new DOMRect(0, vh - 24, vw, 24),
  });
  registerLandmark({
    id: "home-corner",
    type: "home",
    priority: 10,
    climbable: true,
    interactive: false,
    open: true,
    rect: new DOMRect(Math.max(12, vw * 0.04), vh - 120, 80, 80),
  });
  void floor;
}

export function collectPlatforms(): TerrainPlatform[] {
  if (typeof window === "undefined") return [];
  scanDomLandmarks();
  ensureFloorAndHome();
  refreshLandmarkRects();
  const landmarks = listLandmarks();
  const out: TerrainPlatform[] = [];
  for (const lm of landmarks) {
    if (!lm.open && (lm.type === "modal" || lm.type === "drawer")) continue;
    if (lm.rect) {
      const el =
        typeof document !== "undefined"
          ? document.querySelector(`[data-mascot-id="${CSS.escape(lm.id)}"]`) ||
            document.getElementById(lm.id)
          : null;
      if (el && !isOpenOverlay(el) && (lm.type === "modal" || lm.type === "drawer"))
        continue;
    }
    const p = rectToPlatform(lm, window.scrollY || 0);
    if (p) out.push(p);
  }
  return out;
}

export function pickInterestingPlatform(
  platforms: TerrainPlatform[],
  fromId?: string,
  preferModal?: boolean,
): TerrainPlatform | null {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1;

  const candidates = platforms.filter((p) => {
    if (p.id === fromId || p.type === "floor" || p.type === "home") return false;
    if (p.priority < 2) return false;
    if (
      p.clientX < 48 ||
      p.clientX > vw - 48 ||
      p.clientY < 48 ||
      p.clientY > vh - 48
    )
      return false;
    return true;
  });

  if (preferModal) {
    const modals = candidates.filter((p) => p.type === "modal");
    if (modals.length) return modals[Math.floor(Math.random() * modals.length)];
  }

  const cards = candidates.filter((p) => p.type === "card");
  if (cards.length && Math.random() < 0.62) {
    return cards[Math.floor(Math.random() * Math.min(6, cards.length))];
  }

  const climbable = candidates.filter(
    (p) =>
      p.type === "nav" ||
      p.type === "button" ||
      p.type === "hero" ||
      p.type === "modal" ||
      p.priority >= 4,
  );
  if (climbable.length && Math.random() < 0.7) {
    climbable.sort(
      (a, b) => b.priority - a.priority + (Math.random() - 0.5),
    );
    return climbable[Math.floor(Math.random() * Math.min(3, climbable.length))];
  }

  if (!candidates.length) {
    return platforms.find((p) => p.id === "home-corner") ?? null;
  }
  candidates.sort(
    (a, b) => b.priority - a.priority + (Math.random() - 0.5) * 1.5,
  );
  return candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
}

export function getHomePlatform(
  platforms: TerrainPlatform[],
): TerrainPlatform | null {
  return platforms.find((p) => p.id === "home-corner") ?? null;
}

export function planHops(
  from: TerrainPlatform | null,
  to: TerrainPlatform,
  platforms: TerrainPlatform[],
): TerrainPlatform[] {
  if (!from || from.id === to.id) return [to];
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  if (dist < 0.85) return [to];

  let mid: TerrainPlatform | null = null;
  let best = Infinity;
  for (const p of platforms) {
    if (p.id === from.id || p.id === to.id || p.type === "floor") continue;
    if (
      typeof window !== "undefined" &&
      (p.clientX < 40 ||
        p.clientX > window.innerWidth - 40 ||
        p.clientY < 40 ||
        p.clientY > window.innerHeight - 40)
    )
      continue;
    const d1 = Math.hypot(p.x - from.x, p.y - from.y);
    const d2 = Math.hypot(p.x - to.x, p.y - to.y);
    const score = d1 + d2;
    if (score < dist * 1.2 && score < best) {
      best = score;
      mid = p;
    }
  }
  return mid ? [mid, to] : [to];
}

export function scrollLandmarkIntoView(p: TerrainPlatform) {
  if (typeof document === "undefined") return;
  const el =
    document.querySelector(`[data-mascot-id="${CSS.escape(p.id)}"]`) ||
    document.getElementById(p.id);
  if (el && "scrollIntoView" in el) {
    (el as HTMLElement).scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }
}
