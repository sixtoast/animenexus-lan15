/**
 * Map the live page into walkable platforms.
 * Hitboxes track real DOM rects (viewport space) as closely as possible.
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

/** Pixel rect → world (viewport only; rebuild on scroll). */
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

/**
 * Accurate platform from a DOMRect.
 * Uses full width/height in world units (not heavily shrunk).
 * Small padding only to avoid edge-bleed into neighboring widgets.
 */
export function rectToPlatformFromDom(
  id: string,
  type: string,
  r: DOMRect,
  priority: number,
): TerrainPlatform | null {
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  if (r.width < 10 || r.height < 10) return null;
  // Must intersect viewport
  if (r.bottom < 4 || r.top > vh - 4 || r.right < 4 || r.left > vw - 4) return null;

  const aspect = vw / vh;
  // Clip rect to viewport for accurate on-screen hitbox
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

  // 96% of clipped size — tight to the real control
  const hw = Math.max(0.04, (w / vw) * aspect * 0.96);
  const hh = Math.max(0.025, (h / vh) * 0.96 * 0.5); // half-height for top surface feel

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

const SURFACE_SELECTOR = [
  "[data-mascot-landmark]",
  "nav",
  "header",
  "[role='navigation']",
  "[role='dialog']",
  ".modal-root",
  ".modal",
  ".ai-panel",
  ".cmdk-root",
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
  if (el.getAttribute("role") === "dialog" || el.classList.contains("modal"))
    return "modal";
  if (el.classList.contains("anime-card") || el.classList.contains("home-rail-card"))
    return "card";
  if (el.tagName === "NAV" || el.getAttribute("role") === "navigation") return "nav";
  if (el.classList.contains("btn") || el.tagName === "BUTTON") return "button";
  if (el.classList.contains("hero") || el.classList.contains("home-hero")) return "hero";
  if (el.classList.contains("ai-panel") || el.classList.contains("cmdk-root"))
    return "modal";
  return "generic";
}

function inferPriority(type: LandmarkType): number {
  switch (type) {
    case "modal":
      return 8;
    case "card":
      return 5;
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
    const type = (el.getAttribute("data-mascot-landmark") as LandmarkType) || inferType(el);
    const id =
      el.getAttribute("data-mascot-id") ||
      el.id ||
      `surface-${type}-${i}`;
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
    const p = rectToPlatform(lm, window.scrollY || 0);
    if (p) {
      seen.add(lm.id);
      out.push(p);
    }
  }

  // Also direct-measure open modals (often portaled)
  document
    .querySelectorAll(
      '[role="dialog"]:not([hidden]), .modal-root.open, .ai-panel.open, .cmdk-root[data-open="true"]',
    )
    .forEach((el, i) => {
      const id = el.id || `live-modal-${i}`;
      if (seen.has(id)) return;
      const r = el.getBoundingClientRect();
      const p = rectToPlatformFromDom(id, "modal", r, 9);
      if (p) {
        seen.add(id);
        out.push(p);
      }
    });

  const aspect = window.innerWidth / (window.innerHeight || 1);
  // Home pad — maps to bottom-right corner (habitat)
  out.push({
    id: "home-corner",
    type: "home",
    x: aspect * 0.72,
    y: -0.72,
    hw: 0.22,
    hh: 0.1,
    priority: 1,
    clientX: window.innerWidth - 80,
    clientY: window.innerHeight - 100,
  });

  out.push({
    id: "viewport-floor",
    type: "floor",
    x: 0,
    y: -0.92,
    hw: aspect * 0.95,
    hh: 0.05,
    priority: 0,
    clientX: window.innerWidth / 2,
    clientY: window.innerHeight - 12,
  });

  return out;
}

export function pickWanderPlatform(
  platforms: TerrainPlatform[],
  fromId?: string,
  preferModal?: boolean,
): TerrainPlatform | null {
  let candidates = platforms.filter(
    (p) =>
      p.id !== fromId &&
      p.type !== "floor" &&
      p.type !== "home" &&
      p.priority >= 2,
  );
  if (preferModal) {
    const modals = candidates.filter((p) => p.type === "modal");
    if (modals.length) candidates = modals;
  }
  if (!candidates.length) {
    return platforms.find((p) => p.id === "home-corner") ?? null;
  }
  candidates.sort(
    (a, b) => b.priority - a.priority + (Math.random() - 0.5) * 1.5,
  );
  return candidates[Math.floor(Math.random() * Math.min(4, candidates.length))];
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
