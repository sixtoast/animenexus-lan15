/**
 * Sprint 10 — UI as a physical world
 *
 * DOM → semantic terrain. Not every rectangle is the same platform.
 * Landmarks carry type, climbability, interaction points, and importance.
 */

export type LandmarkType =
  | "card"
  | "button"
  | "modal"
  | "navbar"
  | "sidebar"
  | "search"
  | "hero"
  | "notification"
  | "dropdown"
  | "tab"
  | "carousel"
  | "progress"
  | "rail"
  | "nav" // legacy alias → navbar
  | "generic";

export type InteractionPoint = {
  /** Screen client coords */
  clientX: number;
  clientY: number;
  kind: "center" | "top" | "edge" | "header" | "thumb" | "label";
};

export type Landmark = {
  id: string;
  type: LandmarkType;
  /** Higher = more interesting to the Director */
  priority: number;
  /** 0–1 semantic importance (cards/modals higher than generic) */
  importance: number;
  rect: DOMRect | null;
  el: WeakRef<Element> | null;
  visible: boolean;
  interactive: boolean;
  climbable: boolean;
  /** open for modals/dropdowns; true for static surfaces */
  open: boolean;
  /** Preferred screen points for approach / peek / sit */
  points: InteractionPoint[];
};

const landmarks = new Map<string, Landmark>();

const TYPE_DEFAULTS: Record<
  LandmarkType,
  { priority: number; importance: number; climbable: boolean }
> = {
  card: { priority: 3, importance: 0.75, climbable: true },
  button: { priority: 2, importance: 0.45, climbable: false },
  modal: { priority: 5, importance: 0.95, climbable: true },
  navbar: { priority: 1.5, importance: 0.35, climbable: false },
  nav: { priority: 1.5, importance: 0.35, climbable: false },
  sidebar: { priority: 2, importance: 0.4, climbable: false },
  search: { priority: 3.5, importance: 0.7, climbable: false },
  hero: { priority: 4, importance: 0.85, climbable: true },
  notification: { priority: 4.5, importance: 0.8, climbable: false },
  dropdown: { priority: 3, importance: 0.55, climbable: false },
  tab: { priority: 2, importance: 0.4, climbable: false },
  carousel: { priority: 3.5, importance: 0.7, climbable: true },
  progress: { priority: 2.5, importance: 0.5, climbable: true },
  rail: { priority: 2.5, importance: 0.55, climbable: true },
  generic: { priority: 1, importance: 0.25, climbable: false },
};

function normalizeType(raw: string): LandmarkType {
  const t = raw.toLowerCase().trim();
  if (t === "nav") return "navbar";
  if (t in TYPE_DEFAULTS) return t as LandmarkType;
  return "generic";
}

function isVisibleRect(r: DOMRect): boolean {
  if (r.width < 8 || r.height < 8) return false;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false;
  return true;
}

function isInteractiveEl(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "button" || tag === "a" || tag === "input" || tag === "select")
    return true;
  if (el.getAttribute("role") === "button") return true;
  if (el.getAttribute("tabindex") != null) return true;
  return el.hasAttribute("data-mascot-interactive");
}

function isOpenEl(el: Element, type: LandmarkType): boolean {
  if (type === "modal" || type === "dropdown") {
    if (el.hasAttribute("hidden")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.getAttribute("data-open") === "true") return true;
    if (el.classList.contains("open")) return true;
    const style = typeof window !== "undefined" ? getComputedStyle(el) : null;
    if (style && (style.display === "none" || style.visibility === "hidden"))
      return false;
    return isVisibleRect(el.getBoundingClientRect());
  }
  return true;
}

function buildPoints(r: DOMRect, type: LandmarkType): InteractionPoint[] {
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const points: InteractionPoint[] = [
    { clientX: cx, clientY: cy, kind: "center" },
  ];
  switch (type) {
    case "modal":
      points.push(
        { clientX: cx, clientY: r.top + 12, kind: "header" },
        { clientX: r.left + 16, clientY: cy, kind: "edge" },
        { clientX: cx, clientY: r.top - 4, kind: "top" },
      );
      break;
    case "card":
    case "carousel":
    case "hero":
      points.push(
        { clientX: cx, clientY: r.top + r.height * 0.35, kind: "thumb" },
        { clientX: cx, clientY: r.bottom - 18, kind: "label" },
        { clientX: cx, clientY: r.top + 8, kind: "top" },
      );
      break;
    case "search":
      points.push(
        { clientX: r.left + 24, clientY: cy, kind: "label" },
        { clientX: cx, clientY: cy, kind: "center" },
      );
      break;
    case "button":
      points.push({ clientX: cx, clientY: cy, kind: "center" });
      break;
    case "progress":
      points.push(
        { clientX: r.left + 8, clientY: cy, kind: "edge" },
        { clientX: r.right - 8, clientY: cy, kind: "edge" },
      );
      break;
    case "navbar":
    case "nav":
      points.push({ clientX: cx, clientY: r.bottom + 6, kind: "top" });
      break;
    case "notification":
      points.push({ clientX: cx, clientY: r.bottom + 4, kind: "top" });
      break;
    default:
      break;
  }
  return points;
}

function enrichLandmark(
  id: string,
  el: Element,
  type: LandmarkType,
  priorityOverride?: number,
): Landmark {
  const defaults = TYPE_DEFAULTS[type] ?? TYPE_DEFAULTS.generic;
  const rect = el.getBoundingClientRect();
  const visible = isVisibleRect(rect);
  return {
    id,
    type,
    priority: priorityOverride ?? defaults.priority,
    importance: defaults.importance,
    rect,
    el: new WeakRef(el),
    visible,
    interactive: isInteractiveEl(el),
    climbable: defaults.climbable && rect.height >= 48 && rect.width >= 64,
    open: isOpenEl(el, type),
    points: visible ? buildPoints(rect, type) : [],
  };
}

export function registerLandmark(
  id: string,
  el: Element,
  type: LandmarkType | string = "generic",
  priority?: number,
) {
  const t = normalizeType(String(type));
  landmarks.set(id, enrichLandmark(id, el, t, priority));
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
    const next = enrichLandmark(lm.id, el, lm.type, lm.priority);
    landmarks.set(lm.id, next);
  }
}

export function listLandmarks(): Landmark[] {
  return [...landmarks.values()].filter((l) => l.rect && l.visible);
}

export function listByType(type: LandmarkType): Landmark[] {
  return listLandmarks().filter((l) => l.type === type || (type === "navbar" && l.type === "nav"));
}

export function pickInterestingLandmark(): Landmark | null {
  refreshLandmarkRects();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let best: Landmark | null = null;
  let bestScore = -Infinity;

  for (const lm of landmarks.values()) {
    if (!lm.visible || !lm.rect) continue;
    if ((lm.type === "modal" || lm.type === "dropdown") && !lm.open) continue;
    const r = lm.rect;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = Math.hypot(cx - vw / 2, cy - vh / 2);
    const score =
      lm.priority * 1000 +
      lm.importance * 400 -
      dist +
      (lm.climbable ? 80 : 0) +
      (lm.interactive ? 40 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = lm;
    }
  }
  return best;
}

/** Preferred approach point for a landmark (header / thumb / center). */
export function preferredPoint(
  lm: Landmark,
  prefer: InteractionPoint["kind"] = "center",
): InteractionPoint | null {
  if (!lm.points.length) return null;
  return lm.points.find((p) => p.kind === prefer) ?? lm.points[0];
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
  pointKind: InteractionPoint["kind"] = "center",
): { x: number; z: number } | null {
  const p = preferredPoint(lm, pointKind);
  if (p) return screenToHabitatTarget(p.clientX, p.clientY);
  if (!lm.rect) return null;
  const cx = lm.rect.left + lm.rect.width / 2;
  const cy = lm.rect.top + lm.rect.height / 2;
  return screenToHabitatTarget(cx, cy);
}

/** What surface is under a habitat-ish screen point (best overlapping landmark). */
export function standingOn(
  clientX: number,
  clientY: number,
): Landmark | null {
  refreshLandmarkRects();
  let best: Landmark | null = null;
  let bestArea = Infinity;
  for (const lm of landmarks.values()) {
    const r = lm.rect;
    if (!r || !lm.visible) continue;
    if (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    ) {
      const area = r.width * r.height;
      // Prefer smallest containing surface (most specific)
      if (area < bestArea) {
        bestArea = area;
        best = lm;
      }
    }
  }
  return best;
}

const AUTO_SELECTORS: { selector: string; type: LandmarkType; priority: number }[] =
  [
    { selector: ".anime-card, .home-rail-card, [data-anime-card]", type: "card", priority: 3 },
    { selector: '[role="dialog"], .modal-root, .modal, .ai-panel', type: "modal", priority: 5 },
    { selector: 'header nav, nav[aria-label], .site-nav, .navbar', type: "navbar", priority: 1.5 },
    { selector: 'input[type="search"], [role="search"], .search-bar, .cmdk-input', type: "search", priority: 3.5 },
    { selector: ".hero, .home-hero, [data-mascot-hero]", type: "hero", priority: 4 },
    { selector: '[role="alert"], .toast, .notification', type: "notification", priority: 4.5 },
    { selector: '[role="menu"], .dropdown-menu, [data-open="true"].menu', type: "dropdown", priority: 3 },
    { selector: '[role="tablist"] [role="tab"], .tabs button', type: "tab", priority: 2 },
    { selector: ".carousel, .rail-scroll, [data-carousel]", type: "carousel", priority: 3.5 },
    { selector: 'progress, [role="progressbar"], .progress-bar', type: "progress", priority: 2.5 },
    { selector: "aside, .sidebar, [data-sidebar]", type: "sidebar", priority: 2 },
    { selector: ".home-rail, [data-rail]", type: "rail", priority: 2.5 },
  ];

export function scanDomLandmarks() {
  if (typeof document === "undefined") return;

  // Explicit opt-in markers always win
  document.querySelectorAll("[data-mascot-landmark]").forEach((el, i) => {
    const id =
      el.getAttribute("data-mascot-id") ||
      el.id ||
      `marked-${el.tagName}-${i}`;
    const type = normalizeType(
      el.getAttribute("data-mascot-landmark") || "generic",
    );
    const priority = Number(el.getAttribute("data-mascot-priority") || "NaN");
    registerLandmark(
      id,
      el,
      type,
      Number.isFinite(priority) ? priority : undefined,
    );
  });

  // Semantic auto-scan
  for (const rule of AUTO_SELECTORS) {
    document.querySelectorAll(rule.selector).forEach((el, i) => {
      if (el.hasAttribute("data-mascot-landmark")) return; // already registered
      const id =
        el.id ||
        el.getAttribute("data-mascot-id") ||
        `auto-${rule.type}-${i}-${el.tagName}`;
      if (landmarks.has(id)) return;
      registerLandmark(id, el, rule.type, rule.priority);
    });
  }
}

/** Hint string for thoughts / director debug */
export function describeLandmark(lm: Landmark): string {
  const bits: string[] = [lm.type];
  if (lm.climbable) bits.push("climbable");
  if (lm.interactive) bits.push("interactive");
  if (!lm.open) bits.push("closed");
  return bits.join(" · ");
}
