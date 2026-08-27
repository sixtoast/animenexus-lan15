"use client";

import { useCallback, useEffect, useState } from "react";

type WeatherSnap = {
  temperatureC: number | null;
  label: string;
  moodHint: string;
  isDay: boolean | null;
};

const LS_ENABLED = "animenexus.weather-context.v1";

export function WeatherContextHint() {
  const [enabled, setEnabled] = useState(false);
  const [weather, setWeather] = useState<WeatherSnap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(LS_ENABLED) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Location not available in this browser.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const q = new URLSearchParams({
            lat: String(pos.coords.latitude),
            lon: String(pos.coords.longitude),
          });
          const res = await fetch(`/api/weather?${q}`);
          const data = await res.json();
          if (data.weather) {
            setWeather(data.weather);
          } else {
            setWeather(null);
            setError("Weather offline.");
          }
        } catch {
          setError("Weather offline.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError("Location permission denied — weather stays off.");
      },
      { maximumAge: 30 * 60 * 1000, timeout: 12_000 },
    );
  }, []);

  useEffect(() => {
    if (enabled) load();
    else {
      setWeather(null);
      setError(null);
    }
  }, [enabled, load]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(LS_ENABLED, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="detail-section" aria-labelledby="weather-context-h">
      <h2 id="weather-context-h">Local weather (optional)</h2>
      <p className="tools-hint" style={{ marginBottom: 10 }}>
        Soft mood hint only — never changes rankings or recommendations. Uses
        browser location when you opt in. Powered by Open-Meteo.
      </p>
      <label
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
          fontSize: 14,
        }}
      >
        <input type="checkbox" checked={enabled} onChange={toggle} />
        Use my location for weather context
      </label>
      {loading ? <p className="tools-hint">Loading weather…</p> : null}
      {error ? <p className="tools-hint">{error}</p> : null}
      {weather && enabled ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border, rgba(128,128,128,0.25))",
          }}
        >
          <strong>{weather.label}</strong>
          {weather.temperatureC != null
            ? ` · ${Math.round(weather.temperatureC)}°C`
            : ""}
          {weather.isDay === false ? " · night" : ""}
          <p className="tools-hint" style={{ margin: "6px 0 0" }}>
            {weather.moodHint}
          </p>
        </div>
      ) : null}
    </section>
  );
}
