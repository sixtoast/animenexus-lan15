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
        tier,
        shelfMaxTextures: 12,
        shelfDprMax: 1,
        shelfAntialias: false,
        shelfPreferFallback: true,
        maxPriorityImages: 2,
      };
    case "low":
      return {
        tier,
        shelfMaxTextures: 18,
        shelfDprMax: 1.15,
        shelfAntialias: false,
        shelfPreferFallback: false,
        maxPriorityImages: 3,
      };
    case "balanced":
      return {
        tier,
        shelfMaxTextures: 28,
        shelfDprMax: 1.5,
        shelfAntialias: true,
        shelfPreferFallback: false,
        maxPriorityImages: 4,
      };
    case "full":
    default:
      return {
        tier,
        shelfMaxTextures: 40,
        shelfDprMax: 1.75,
        shelfAntialias: true,
        shelfPreferFallback: false,
        maxPriorityImages: 6,
      };
  }
}
