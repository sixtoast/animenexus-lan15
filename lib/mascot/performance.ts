/**
 * Sprint 21 — Performance
 *
 * Budgets and helpers. Prefer event-driven / throttled work over per-frame cost.
 * Never scan the full DOM every frame.
 */

export type PerfTier = "full" | "balanced" | "low";

export type PerfBudget = {
  tier: PerfTier;
  /** Terrain rebuild interval (ms) when idle */
  terrainIdleMs: number;
  /** Terrain rebuild interval (ms) while scrolling */
  terrainScrollMs: number;
  /** Behaviour tick interval (ms) */
  behaviourMs: number;
  /** Skit attempt interval (ms) */
  skitMs: number;
  /** Max DPR */
  dprMax: number;
  antialias: boolean;
  /** Cap landmarks registered per scan */
  maxLandmarks: number;
};

export function detectPerfTier(opts?: {
  lowPower?: boolean;
  width?: number;
}): PerfTier {
  if (opts?.lowPower) return "low";
  if (typeof window === "undefined") return "balanced";
  const w = opts?.width ?? window.innerWidth;
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (saveData || w <= 480 || cores <= 2) return "low";
  if (w <= 900 || cores <= 4) return "balanced";
  return "full";
}

export function budgetFor(tier: PerfTier): PerfBudget {
  switch (tier) {
    case "low":
      return {
        tier,
        terrainIdleMs: 3200,
        terrainScrollMs: 900,
        behaviourMs: 4800,
        skitMs: 28_000,
        dprMax: 1.25,
        antialias: false,
        maxLandmarks: 24,
      };
    case "balanced":
      return {
        tier,
        terrainIdleMs: 2200,
        terrainScrollMs: 550,
        behaviourMs: 3600,
        skitMs: 18_000,
        dprMax: 1.75,
        antialias: true,
        maxLandmarks: 40,
      };
    case "full":
    default:
      return {
        tier,
        terrainIdleMs: 1800,
        terrainScrollMs: 400,
        behaviourMs: 3200,
        skitMs: 16_000,
        dprMax: 2,
        antialias: true,
        maxLandmarks: 56,
      };
  }
}

/** Leading+trailing throttle */
export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void } {
  let last = 0;
  let timer: number | null = null;
  let pending: Parameters<T> | null = null;

  const run = (args: Parameters<T>) => {
    last = Date.now();
    pending = null;
    fn(...args);
  };

  const wrapped = ((...args: Parameters<T>) => {
    const now = Date.now();
    pending = args;
    if (now - last >= ms) {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
      run(args);
      return;
    }
    if (timer == null) {
      timer = window.setTimeout(
        () => {
          timer = null;
          if (pending) run(pending);
        },
        Math.max(0, ms - (now - last)),
      );
    }
  }) as T & { cancel: () => void };

  wrapped.cancel = () => {
    if (timer != null) window.clearTimeout(timer);
    timer = null;
    pending = null;
  };

  return wrapped;
}

/** True when the tab is visible and document is focused enough to animate. */
export function isPageActive(): boolean {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

/** Soft sleep mode — expensive systems can idle harder. */
export function shouldDeepIdle(input: {
  anim?: string;
  intention?: string;
  msSinceInteract: number;
}): boolean {
  if (input.anim === "sleep" || input.intention === "sleep") return true;
  if (input.msSinceInteract > 90_000) return true;
  return false;
}

/** Optional debug counters (dev only). */
const counters = {
  terrainBuilds: 0,
  behaviourTicks: 0,
  lastTerrainMs: 0,
};

export function noteTerrainBuild(ms: number) {
  counters.terrainBuilds += 1;
  counters.lastTerrainMs = ms;
}

export function noteBehaviourTick() {
  counters.behaviourTicks += 1;
}

export function getPerfCounters() {
  return { ...counters };
}

export function resetPerfCounters() {
  counters.terrainBuilds = 0;
  counters.behaviourTicks = 0;
  counters.lastTerrainMs = 0;
}
