"use client";

import { useEffect, useState } from "react";
import {
  readMyServices,
  STREAMING_SERVICES,
  toggleService,
  writeMyServices,
  type StreamingServiceId,
} from "@/lib/my-services";
import { playCue } from "@/lib/sound-engine";

export function MyServicesSettings() {
  const [services, setServices] = useState<StreamingServiceId[]>([]);
  const [region, setRegion] = useState("US");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = readMyServices();
    setServices(p.services);
    setRegion(p.region);
    setReady(true);
  }, []);

  function persist(nextServices: StreamingServiceId[], nextRegion: string) {
    const ok = writeMyServices({
      services: nextServices,
      region: nextRegion,
    });
    if (ok) {
      setSaved(true);
      playCue("filter_select");
      window.setTimeout(() => setSaved(false), 1200);
    }
  }

  function onToggle(id: StreamingServiceId) {
    const next = toggleService(services, id);
    setServices(next);
    persist(next, region);
  }

  function onRegion(v: string) {
    const r = v.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    setRegion(r);
    if (r.length === 2) persist(services, r);
  }

  if (!ready) {
    return <p className="account-note">Loading services…</p>;
  }

  return (
    <div className="my-services">
      <p className="account-note">
        Tell us which services <strong>you</strong> use. Watchmode only reports
        where a title is listed — not that you subscribe. Region is required for
        accurate availability.
      </p>

      <label className="filter-label" htmlFor="stream-region">
        Country (ISO-2)
      </label>
      <input
        id="stream-region"
        className="filter-input"
        value={region}
        onChange={(e) => onRegion(e.target.value)}
        maxLength={2}
        placeholder="US"
        style={{ maxWidth: 80, marginBottom: 16 }}
        aria-describedby="stream-region-hint"
      />
      <p id="stream-region-hint" className="tools-hint" style={{ marginTop: -8 }}>
        e.g. US, GB, JP, ZA — never assume one country globally.
      </p>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend className="filter-label" style={{ marginBottom: 8 }}>
          My services
        </legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {STREAMING_SERVICES.map((s) => {
            const checked = services.includes(s.id);
            return (
              <label
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(s.id)}
                />
                {s.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {saved ? (
        <p className="tools-hint" style={{ marginTop: 10, color: "var(--color-accent)" }}>
          Saved on this device.
        </p>
      ) : services.length === 0 ? (
        <p className="tools-hint" style={{ marginTop: 10 }}>
          No services selected — "Available to me" filters stay off.
        </p>
      ) : (
        <p className="tools-hint" style={{ marginTop: 10 }}>
          {services.length} service{services.length === 1 ? "" : "s"} · region{" "}
          {region}
        </p>
      )}
    </div>
  );
}
