/**
 * Site performance budgets (Awwwards Sprint 15).
 * Complements mascot tiers in lib/mascot/performance.ts.
 */

export type SitePerfTier = "full" | "balanced" | "low" | "mobile";

export type SitePerfBudget = {
  tier: SitePerfTier;
  /** Max concurrent shelf poster textures */
  shelfMaxTextures: number;
  shelfDprMax: number;
  shelfAntialias: boolean;
  /** Prefer CSS/2D shelf when true */
  shelfPreferFallback: boolean;
  /** Cap cards with eager priority */
  maxPriorityImages: number;
};

export function detectSitePerfTier(): SitePerfTier {
  if (typeof window === "undefined") return "balanced";
  const w = window.innerWidth;
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  if (saveData || w <= 480) return "mobile";
  if (cores <= 2 || mem <= 2) return "low";
  if (w <= 900 || cores <= 4 || mem <= 4) return "balanced";
  return "full";
}

export function siteBudgetFor(tier: SitePerfTier): SitePerfBudget {
  switch (tier) {
    case "mobile":
      return {
        tier: "mobile",
        shelfMaxTextures: 16,
        shelfDprMax: 1.25,
        shelfAntialias: false,
        // Still allow WebGL shelf — fallback only when R3F/WebGL blocked
        shelfPreferFallback: false,
        maxPriorityImages: 6,
      };
    case "low":
      return {
        tier: "low",
        shelfMaxTextures: 20,
        shelfDprMax: 1.25,
        shelfAntialias: false,
        shelfPreferFallback: false,
        maxPriorityImages: 8,
      };
    case "balanced":
      return {
        tier: "balanced",
        shelfMaxTextures: 28,
        shelfDprMax: 1.5,
        shelfAntialias: true,
        shelfPreferFallback: false,
        maxPriorityImages: 10,
      };
    case "full":
    default:
      return {
        tier: "full",
        shelfMaxTextures: 40,
        shelfDprMax: 2,
        shelfAntialias: true,
        shelfPreferFallback: false,
        maxPriorityImages: 14,
      };
  }
}
