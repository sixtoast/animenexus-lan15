"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const RECENT_KEY = "anime_nexus_motion_recent_v1";

type Clip = { url: string; source: string };

export function MotionClient() {
  const [url, setUrl] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const pushRecent = useCallback((u: string) => {
    setRecent((prev) => {
      const next = [u, ...prev.filter((x) => x !== u)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  async function loadSamples() {
    setBusy(true);
    setErr(null);
    try {
      // waifu.pics public endpoints (SPA-adjacent sample motion/GIF sources)
      const endpoints = [
        "https://api.waifu.pics/sfw/dance",
        "https://api.waifu.pics/sfw/happy",
        "https://api.waifu.pics/sfw/wave",
        "https://api.waifu.pics/sfw/smile",
        "https://api.waifu.pics/sfw/wink",
        "https://api.waifu.pics/sfw/pat",
      ];
      const results: Clip[] = [];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (!res.ok) continue;
          const j = (await res.json()) as { url?: string };
          if (j.url) results.push({ url: j.url, source: "waifu.pics" });
        } catch {
          /* skip */
        }
      }
      if (!results.length) throw new Error("Sample APIs returned nothing");
      setClips(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load samples");
    } finally {
      setBusy(false);
    }
  }

  function openUrl(u: string) {
    setPreview(u);
    pushRecent(u);
  }

  return (
    <div className="tools-panel">
      <p className="tools-hint" style={{ marginBottom: 16 }}>
        Clip room: load public sample GIFs/clips, or paste your own URL.
        Full SPA upscale pipelines need an external key and are not shipped here.
      </p>

      <div className="daily-actions" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-accent btn-sm"
          disabled={busy}
          onClick={loadSamples}
        >
          {busy ? "Fetching…" : "Load sample clips"}
        </button>
        <Link href="/tools/sauce" className="btn btn-outline btn-sm">
          Sauce →
        </Link>
      </div>

      {err ? <p className="tools-hint">{err}</p> : null}

      <label className="filter-label" htmlFor="motion-url">
        Clip / GIF URL
      </label>
      <div className="picker-row">
        <input
          id="motion-url"
          className="filter-input"
          placeholder="https://…mp4 / gif / webm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={!url.trim()}
          onClick={() => openUrl(url.trim())}
        >
          Preview
        </button>
      </div>

      {preview ? (
        <div style={{ marginTop: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            style={{
              width: "100%",
              maxHeight: 360,
              objectFit: "contain",
              borderRadius: 12,
              background: "#000",
            }}
            onError={() => {
              /* video fallback attempted below */
            }}
          />
          <video
            src={preview}
            controls
            playsInline
            style={{
              width: "100%",
              maxHeight: 360,
              borderRadius: 12,
              background: "#000",
              marginTop: 8,
            }}
          />
        </div>
      ) : null}

      {clips.length > 0 ? (
        <div className="motion-grid" style={{ marginTop: 20 }}>
          {clips.map((c) => (
            <button
              key={c.url}
              type="button"
              className="motion-thumb"
              onClick={() => openUrl(c.url)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.url} alt="" />
              <span>{c.source}</span>
            </button>
          ))}
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <p className="filter-label">Recent</p>
          <div className="daily-actions">
            {recent.map((u) => (
              <button
                key={u}
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openUrl(u)}
              >
                {u.slice(0, 28)}…
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="tools-hint" style={{ marginTop: 20 }}>
        Upscale / AI motion: not available without an external API key. This page
        stays an honest clip room (option A in PARITY).
      </p>
    </div>
  );
}
