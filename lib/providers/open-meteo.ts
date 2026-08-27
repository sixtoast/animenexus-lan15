/**
 * Open-Meteo current weather (API Expansion II Sprint 21).
 * No API key. Soft-fail always. Never required for catalog.
 * Docs: https://open-meteo.com/
 */

import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";

export type WeatherSnapshot = {
  latitude: number;
  longitude: number;
  temperatureC: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
  label: string;
  moodHint: string;
  retrievedAt: string;
};

/** WMO weather interpretation codes (subset). */
function codeLabel(code: number | null): { label: string; moodHint: string } {
  if (code == null)
    return { label: "Unknown conditions", moodHint: "Whatever the sky is doing." };
  if (code === 0)
    return { label: "Clear", moodHint: "Bright outside — good for a focused session." };
  if (code <= 3)
    return { label: "Partly cloudy", moodHint: "Easy indoor viewing weather." };
  if (code <= 48)
    return { label: "Foggy / overcast", moodHint: "Soft light — cozy watch window." };
  if (code <= 67)
    return { label: "Rain", moodHint: "Rainy day — classic binge cue (optional)." };
  if (code <= 77)
    return { label: "Snow", moodHint: "Cold out — warm drink + long series." };
  if (code <= 82)
    return { label: "Showers", moodHint: "Intermittent rain — short cour or movie." };
  if (code <= 99)
    return { label: "Stormy", moodHint: "Storm energy — high-intensity picks optional." };
  return { label: "Weather", moodHint: "Local conditions noted." };
}

export async function fetchOpenMeteoCurrent(
  latitude: number,
  longitude: number,
): Promise<WeatherSnapshot | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  const lat = Math.round(latitude * 100) / 100;
  const lon = Math.round(longitude * 100) / 100;
  const cacheK = cacheKey(["open-meteo", lat, lon]);

  return dedupedFetch(
    cacheK,
    async () => {
      return withProviderLimit("open-meteo", async () => {
        const q = new URLSearchParams({
          latitude: String(lat),
          longitude: String(lon),
          current: "temperature_2m,weather_code,is_day",
          timezone: "auto",
        });
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?${q}`,
          {
            headers: { Accept: "application/json" },
            next: { revalidate: 1800 },
          },
        );
        if (!res.ok) {
          console.warn("[open-meteo] HTTP", res.status);
          return null;
        }
        const j = (await res.json()) as {
          current?: {
            temperature_2m?: number;
            weather_code?: number;
            is_day?: number;
          };
        };
        const c = j.current;
        if (!c) return null;
        const code = c.weather_code ?? null;
        const { label, moodHint } = codeLabel(code);
        return {
          latitude: lat,
          longitude: lon,
          temperatureC:
            typeof c.temperature_2m === "number" ? c.temperature_2m : null,
          weatherCode: code,
          isDay: c.is_day != null ? Boolean(c.is_day) : null,
          label,
          moodHint,
          retrievedAt: new Date().toISOString(),
        };
      });
    },
    CACHE_TTL.short,
  ).catch(() => null);
}
