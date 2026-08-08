/**
 * Living world — time-of-day atmosphere + outing cadence.
 * Default is chill in the corner; occasional breakouts.
 */

import { dayPart, routineBias, type DayPart } from "./personality";

export type WorldMood = {
  part: DayPart;
  label: string;
  stillness: number;
  tipColor: string;
  emissive: number;
  preferNap: boolean;
  preferExplore: boolean;
  ambientLine?: string;
};

export function worldMood(date = new Date()): WorldMood {
  const part = dayPart(date);
  const r = routineBias(part);
  const month = date.getMonth();
  const day = date.getDate();

  let seasonal: string | undefined;
  if (month === 9 && day >= 25) seasonal = "halloween";
  if (month === 11 && day >= 20) seasonal = "winter";
  if (month === 0 && day <= 5) seasonal = "newyear";

  const base: Record<
    DayPart,
    Pick<
      WorldMood,
      "label" | "stillness" | "tipColor" | "emissive" | "ambientLine"
    >
  > = {
    dawn: {
      label: "Dawn desk",
      stillness: 0.75,
      tipColor: "#f0c4a8",
      emissive: 0.35,
      ambientLine: "Soft light…",
    },
    morning: {
      label: "Morning",
      stillness: 0.4,
      tipColor: "#f0b090",
      emissive: 0.55,
      ambientLine: "Stretch first.",
    },
    afternoon: {
      label: "Afternoon",
      stillness: 0.35,
      tipColor: "#f0a090",
      emissive: 0.6,
    },
    evening: {
      label: "Evening",
      stillness: 0.45,
      tipColor: "#f09888",
      emissive: 0.7,
      ambientLine: "Good hour for signals.",
    },
    night: {
      label: "Night watch",
      stillness: 0.6,
      tipColor: "#e88878",
      emissive: 0.85,
      ambientLine: "Late console glow.",
    },
    late: {
      label: "Deep night",
      stillness: 0.88,
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

/** Long gaps at home — chill is the default. */
export function outingIntervalMs(mood: WorldMood, lowPower: boolean): number {
  const base = lowPower ? 45000 : 32000;
  const stretch = mood.stillness * 28000;
  const exploreBoost = mood.preferExplore ? -8000 : 6000;
  return Math.max(18000, base + stretch + exploreBoost + Math.random() * 16000);
}

/** How long to stay on a destination before heading home. */
export function lingerMs(mood: WorldMood): number {
  return 2200 + mood.stillness * 1800 + Math.random() * 2000;
}

/** Extra home rest after returning from a breakout. */
export function homeRestMs(mood: WorldMood): number {
  return 12000 + mood.stillness * 20000 + Math.random() * 10000;
}
