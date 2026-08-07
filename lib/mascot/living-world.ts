/**
 * Sprint 3 — Living world
 * Time-of-day atmosphere, seasonal accents, ambient world state.
 */

import { dayPart, routineBias, type DayPart } from "./personality";

export type WorldMood = {
  part: DayPart;
  label: string;
  /** 0–1 how “settled” the desk should feel */
  stillness: number;
  /** lantern tip tint */
  tipColor: string;
  emissive: number;
  preferNap: boolean;
  preferExplore: boolean;
  ambientLine?: string;
};

export function worldMood(date = new Date()): WorldMood {
  const part = dayPart(date);
  const r = routineBias(part);
  const month = date.getMonth(); // 0–11
  const day = date.getDate();

  // Light seasonal hooks
  let seasonal: string | undefined;
  if (month === 9 && day >= 25) seasonal = "halloween"; // late Oct
  if (month === 11 && day >= 20) seasonal = "winter";
  if (month === 0 && day <= 5) seasonal = "newyear";

  const base: Record<
    DayPart,
    Pick<WorldMood, "label" | "stillness" | "tipColor" | "emissive" | "ambientLine">
  > = {
    dawn: {
      label: "Dawn desk",
      stillness: 0.7,
      tipColor: "#f0c4a8",
      emissive: 0.35,
      ambientLine: "Soft light…",
    },
    morning: {
      label: "Morning",
      stillness: 0.35,
      tipColor: "#f0b090",
      emissive: 0.55,
      ambientLine: "Stretch first.",
    },
    afternoon: {
      label: "Afternoon",
      stillness: 0.3,
      tipColor: "#f0a090",
      emissive: 0.6,
    },
    evening: {
      label: "Evening",
      stillness: 0.4,
      tipColor: "#f09888",
      emissive: 0.7,
      ambientLine: "Good hour for signals.",
    },
    night: {
      label: "Night watch",
      stillness: 0.55,
      tipColor: "#e88878",
      emissive: 0.85,
      ambientLine: "Late console glow.",
    },
    late: {
      label: "Deep night",
      stillness: 0.85,
      tipColor: "#d07068",
      emissive: 0.4,
      ambientLine: "Dim the lantern…",
    },
  };

  const b = base[part];
  if (seasonal === "halloween") {
    b.tipColor = "#c080ff";
    b.ambientLine = "Odd hour…";
  }
  if (seasonal === "winter" || seasonal === "newyear") {
    b.tipColor = "#a8d0f0";
  }

  return {
    part,
    ...b,
    preferNap: r.preferNap,
    preferExplore: r.preferExplore,
  };
}

/** Outing interval ms shaped by world stillness */
export function outingIntervalMs(mood: WorldMood, lowPower: boolean): number {
  const base = lowPower ? 20000 : 14000;
  const stretch = mood.stillness * 12000;
  return base + stretch + Math.random() * 8000;
}

export function lingerMs(mood: WorldMood): number {
  return 1800 + mood.stillness * 2000 + Math.random() * 1500;
}
