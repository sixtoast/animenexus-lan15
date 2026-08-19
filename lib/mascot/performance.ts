/**
 * Adaptive mascot rendering (master plan · Sprint 16).
 *
 * Plan mapping:
 *   High    → full
 *   Medium  → balanced
 *   Low     → low
 *   Mobile  → mobile (phones / save-data)
 *   Reduced motion → host keeps companion with minimal movement (not forced remove)
 *
 * Prefer event-driven / throttled work over per-frame cost.
 */

export type PerfTier = "full" | "balanced" | "low" | "mobile";

/** Human labels for dock / a11y. */
export const PERF_TIER_LABEL: Record<PerfTier, string> = {
  full: "High",
  balanced: "Medium",
  low: "Low",
  mobile: "Mobile",
};

export type PerfBudget = {
  tier: PerfTier;
  terrainIdleMs: number;
  terrainScrollMs: number;
  behaviourMs: number;
  skitMs: number;
  dprMax: number;
  antialias: boolean;
  maxLandmarks: number;
  richLighting: boolean;
  secondaryMotion: boolean;
};

export function detectPerfTier(opts?: {
  lowPower?: boolean;
  width?: number;
  mobile?: boolean;
}): PerfTier {
  if (opts?.lowPower || opts?.mobile) return "mobile";
  if (typeof window === "undefined") return "balanced";

  const w = opts?.width ?? window.innerWidth;
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  if (saveData || w <= 480 || (w <= 640 && cores <= 4)) return "mobile";
  if (cores <= 2 || mem <= 2) return "low";
  if (w <= 900 || cores <= 4 || mem <= 4) return "balanced";
  return "full";
}

export function budgetFor(tier: PerfTier): PerfBudget {
  switch (tier) {
    case "mobile":
      return {
        tier,
        terrainIdleMs: 4000,
        terrainScrollMs: 1200,
        behaviourMs: 5600,
        skitMs: 36_000,
        dprMax: 1.15,
        antialias: false,
        maxLandmarks: 16,
        richLighting: false,
        secondaryMotion: false,
      };
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
        richLighting: false,
        secondaryMotion: false,
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
        richLighting: true,
        secondaryMotion: true,
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
        richLighting: true,
        secondaryMotion: true,
      };
  }
}

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

export function isPageActive(): boolean {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

export function shouldDeepIdle(input: {
  anim?: string;
  intention?: string;
  msSinceInteract: number;
}): boolean {
  if (input.anim === "sleep" || input.intention === "sleep") return true;
  if (input.msSinceInteract > 90_000) return true;
  return false;
}

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
