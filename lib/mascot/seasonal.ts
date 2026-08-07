/**
 * Seasonal + time-of-day cosmetics for Lantern-ko (Sprint M8).
 */

import { dayPart } from "./personality";

export type CosmeticId =
  | "default"
  | "sakura"
  | "summer"
  | "autumn"
  | "winter"
  | "lantern-night"
  | "dawn";

export type Cosmetic = {
  id: CosmeticId;
  label: string;
  tipColor: string;
  emissive: string;
  glowBoost: number;
  cheekTint?: string;
  hat?: "none" | "leaf" | "scarf" | "star";
};

const COSMETICS: Record<CosmeticId, Cosmetic> = {
  default: {
    id: "default",
    label: "Desk default",
    tipColor: "#f0a090",
    emissive: "#f0a090",
    glowBoost: 0,
    hat: "none",
  },
  sakura: {
    id: "sakura",
    label: "Sakura season",
    tipColor: "#f5b8c8",
    emissive: "#e890a8",
    glowBoost: 0.08,
    cheekTint: "#f5a0b0",
    hat: "leaf",
  },
  summer: {
    id: "summer",
    label: "Summer heat",
    tipColor: "#f0c070",
    emissive: "#e8a850",
    glowBoost: 0.05,
    hat: "none",
  },
  autumn: {
    id: "autumn",
    label: "Autumn glow",
    tipColor: "#e88850",
    emissive: "#d07040",
    glowBoost: 0.06,
    hat: "leaf",
  },
  winter: {
    id: "winter",
    label: "Winter hush",
    tipColor: "#c8d8f0",
    emissive: "#a0b8e0",
    glowBoost: 0.04,
    hat: "scarf",
  },
  "lantern-night": {
    id: "lantern-night",
    label: "Night lantern",
    tipColor: "#ffb070",
    emissive: "#ff9040",
    glowBoost: 0.18,
    hat: "star",
  },
  dawn: {
    id: "dawn",
    label: "Dawn blush",
    tipColor: "#f0b0a0",
    emissive: "#e89888",
    glowBoost: 0.1,
    cheekTint: "#f0a090",
    hat: "none",
  },
};

function monthSeason(m: number): CosmeticId {
  if (m >= 2 && m <= 4) return "sakura";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

export function getCosmetic(d = new Date()): Cosmetic {
  const p = dayPart(d);
  if (p === "night" || p === "late") return COSMETICS["lantern-night"];
  if (p === "morning" || p === "dawn") return COSMETICS.dawn;
  return COSMETICS[monthSeason(d.getMonth())];
}

export function listCosmetics(): Cosmetic[] {
  return Object.values(COSMETICS);
}
