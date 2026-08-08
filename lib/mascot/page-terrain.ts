/**
 * Map the live page into walkable platforms.
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

export function screenToWorld(
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  const aspect = vw / vh;
  const x = ((clientX / vw) * 2 - 1) * aspect;
  const y = -((clientY / vh) * 2 - 1);
  return { x, y };
}

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
  // Must be substantially in the viewport to be a land target
  if (r.bottom < 40 || r.top > vh - 40 || r.right < 40 || r.left > vw - 40)
    return null;

  const aspect = vw / vh;
  const left = Math.max(0, r.left);
  const right = Math.min(vw, r.right);
  const top = Math.max(0, r.top);
  const bottom = Math.min(vh, r.bottom);
  const w = right - left;
  const h = bottom - top;
  if (w < 10 || h < 10) return null;

  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const center = screenToWorld(cx, cy);

  const hw = Math.max(0.04, (w / vw) * aspect * 0.96);
  const hh = Math.max(0.025, (h / vh) * 0.96 * 0.5);

  return {
    id,
    type,
    x: center.x,
    y: center.y,
    hw,
    hh,
    priority,
    clientX: cx,
    clientY: cy,
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
  return false;
}

const SURFACE_SELECTOR = [
  "[data-mascot-landmark]",
  "nav",
  "header",
  "[role='navigation']",
  ".anime-card",
  ".home-rail-card",
  ".home-panel",
  ".hero",
  ".home-hero",
  ".btn",
  "button.btn",
  ".home-hero-actions",
  ".section-head",
  ".quote-banner",
  ".ritual-line",
].join(",");

function inferType(el: Element): LandmarkType {
  if (
    el.classList.contains("anime-card") ||
    el.classList.contains("home-rail-card")
  )
    return "card";
  if (el.tagName === "NAV" || el.getAttribute("role") === "navigation")
    return "nav";
  if (el.classList.contains("btn") || el.tagName === "BUTTON") return "button";
  if (el.classList.contains("hero") || el.classList.contains("home-hero"))
    return "hero";
  return "generic";
}

function inferPriority(type: LandmarkType): number {
  switch (type) {
    case "modal":
      return 9;
    case "card":
      return 7;
    case "nav":
      return 4;
    case "button":
      return 3;
    case "hero":
      return 3;
    default:
      return 2;
  }
}

export function buildTerrain(): TerrainPlatform[] {
  if (typeof window === "undefined") return [];

  document.querySelectorAll(SURFACE_SELECTOR).forEach((el, i) => {
    const type =
      (el.getAttribute("data-mascot-landmark") as LandmarkType) ||
      inferType(el);
    const id =
      el.getAttribute("data-mascot-id") || el.id || `surface-${type}-${i}`;
    const priority = Number(
      el.getAttribute("data-mascot-priority") || inferPriority(type),
    );
    registerLandmark(id, el, type, priority);
  });

  scanDomLandmarks();
  refreshLandmarkRects();

  const out: TerrainPlatform[] = [];
  const seen = new Set<string>();

  for (const lm of listLandmarks()) {
    if (seen.has(lm.id)) continue;
    if (lm.type === "modal") continue;
    const p = rectToPlatform(lm, window.scrollY || 0);
    if (p) {
      seen.add(lm.id);
      out.push(p);
    }
  }

  document
    .querySelectorAll(
      '[role="dialog"], .modal-root, .modal, .ai-panel, .cmdk-root',
    )
    .forEach((el, i) => {
      if (!isOpenOverlay(el)) return;
      const id = el.id || `live-modal-${i}`;
      if (seen.has(id)) return;
      const r = el.getBoundingClientRect();
      const p = rectToPlatformFromDom(id, "modal", r, 10);
      if (p) {
        seen.add(id);
        out.push(p);
      }
    });

  const aspect = window.innerWidth / (window.innerHeight || 1);
  const homeX = Math.min(aspect * 0.78, 1.32);

  out.push({
    id: "home-corner",
    type: "home",
    x: homeX,
    y: -0.72,
    hw: 0.2,
    hh: 0.11,
    priority: 1,
    clientX: window.innerWidth - 56,
    clientY: window.innerHeight - 100,
  });

  out.push({
    id: "viewport-floor",
    type: "floor",
    x: 0,
    y: -0.94,
    hw: aspect * 0.95,
    hh: 0.04,
    priority: 0,
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight - 10,
  });

  return out;
}

/** Prefer on-screen, reachable surfaces only. */
export function pickWanderPlatform(
  platforms: TerrainPlatform[],
  fromId?: string,
  preferModal?: boolean,
): TerrainPlatform | null {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1;

  let candidates = platforms.filter((p) => {
    if (p.id === fromId || p.type === "floor" || p.type === "home") return false;
    if (p.priority < 2) return false;
    // Reachable: rect center must be well inside the viewport
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
    // Prefer mid hops that stay on-screen
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
