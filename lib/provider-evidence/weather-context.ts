import type { WeatherSnapshot } from "@/lib/providers/open-meteo";
import {
  MAX_WEATHER_CONTEXT_ADJUSTMENT,
  type EnvironmentalSessionContext,
} from "./types";

export function toEnvironmentalContext(
  snap: WeatherSnapshot | null | undefined,
): EnvironmentalSessionContext | null {
  if (!snap) return null;
  return {
    isDay: snap.isDay ?? undefined,
    temperatureC: snap.temperatureC ?? undefined,
    apparentTemperatureC: snap.apparentTemperatureC ?? undefined,
    humidity: snap.humidity ?? undefined,
    precipitation: snap.precipitation ?? undefined,
    cloudCover: snap.cloudCover ?? undefined,
    weatherCode: snap.weatherCode ?? undefined,
  };
}

/**
 * Tiny tie-break only. Never overrides explicit mood/controls.
 * Returns additive delta in [-MAX, +MAX].
 */
export function weatherScoreAdjustment(
  ctx: EnvironmentalSessionContext | null | undefined,
  candidatePacing?: number,
): number {
  if (!ctx) return 0;
  let delta = 0;
  const wet = (ctx.precipitation ?? 0) > 0.2;
  const night = ctx.isDay === false;
  const pace = candidatePacing ?? 0.5;
  if (wet || night) {
    delta += (0.5 - pace) * 0.04;
  }
  if (ctx.temperatureC != null && ctx.temperatureC < 5) {
    delta += (0.45 - pace) * 0.02;
  }
  return Math.max(
    -MAX_WEATHER_CONTEXT_ADJUSTMENT,
    Math.min(MAX_WEATHER_CONTEXT_ADJUSTMENT, delta),
  );
}
