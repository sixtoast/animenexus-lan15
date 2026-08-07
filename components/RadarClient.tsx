"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Anime } from "@/lib/types";

const PREFS_KEY = "anime_nexus_radar_prefs";
const ALERTS_KEY = "anime_nexus_radar_alerts";

const GENRES = [
  "",
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

type Prefs = { genre: string; studio: string };

export function RadarClient() {
  const [prefs, setPrefs] = useState<Prefs>({ genre: "", studio: "" });
  const [alerts, setAlerts] = useState(false);
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ genre: "", studio: "", ...JSON.parse(raw) });
      setAlerts(localStorage.getItem(ALERTS_KEY) === "true");
    } catch {
      /* ignore */
    }
  }, []);

  async function scan() {
    setLoading(true);
    setErr(null);
    setScanned(false);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      const q = prefs.genre
        ? `?genre=${encodeURIComponent(prefs.genre)}`
        : "";
      const res = await fetch(`/api/upcoming${q}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Scan failed");
      let list = (j.data || []) as Anime[];
      if (prefs.studio.trim()) {
        const s = prefs.studio.trim().toLowerCase();
        list = list.filter((a) =>
          (a.studios || []).some((x) => x.toLowerCase().includes(s)),
        );
      }
      setItems(list);
      setScanned(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Scan failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleAlerts() {
    const next = !alerts;
    setAlerts(next);
    localStorage.setItem(ALERTS_KEY, String(next));
  }

  return (
    <div>
      <div className="radar-prefs">
        <div className={"radar-dish" + (loading ? " scanning" : "")} aria-hidden>
          <div className="radar-sweep" />
          <div className="radar-core" />
        </div>
        <label className="filter-label">Genre filter</label>
        <select
          className="filter-input"
          value={prefs.genre}
          onChange={(e) => setPrefs((p) => ({ ...p, genre: e.target.value }))}
        >
          {GENRES.map((g) => (
            <option key={g || "any"} value={g}>
              {g || "Any genre"}
            </option>
          ))}
        </select>
        <label className="filter-label">Studio contains (optional)</label>
        <input
          className="filter-input"
          value={prefs.studio}
          onChange={(e) => setPrefs((p) => ({ ...p, studio: e.target.value }))}
          placeholder="e.g. Kyoto"
        />
        <div className="daily-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={scan}
            disabled={loading}
          >
            {loading ? "Scanning…" : "Scan upcoming"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={toggleAlerts}
          >
            Alerts: {alerts ? "on" : "off"}
          </button>
        </div>
        <p className="tools-hint" style={{ marginTop: 8 }}>
          Prefs saved as <code>anime_nexus_radar_prefs</code>. Alerts flag is
          local-only (no push).
        </p>
      </div>

      {err ? <p className="tools-hint">{err}</p> : null}

      {items.length > 0 ? (
        <div className="radar-upcoming-grid" style={{ marginTop: 20 }}>
          {items.map((a, i) => (
            <Link
              key={a.id}
              href={`/anime/${a.id}`}
              className={"radar-item" + (scanned ? " radar-ping" : "")}
              style={{ "--i": i } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.image} alt="" />
              <div className="radar-title">{a.title}</div>
              <div className="radar-air">
                {[a.format, a.season, a.seasonYear || a.year]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </Link>
          ))}
        </div>
      ) : !loading ? (
        <p className="tools-hint" style={{ marginTop: 16 }}>
          Scan to load not-yet-released titles from AniList.
        </p>
      ) : null}
    </div>
  );
}
