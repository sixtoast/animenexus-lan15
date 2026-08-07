"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SauceHit } from "@/lib/sauce";
import { formatTime } from "@/lib/sauce";

export function SauceClient() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [hits, setHits] = useState<SauceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const searchByFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setHits([]);
    setPreview(URL.createObjectURL(file));
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/sauce", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      if (json.error) throw new Error(json.error);
      setHits(json.hits || []);
      if (!(json.hits || []).length)
        setError("No matches — try a clearer frame.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  async function searchByUrl(e?: React.FormEvent) {
    e?.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setHits([]);
    setPreview(url.trim());
    try {
      const res = await fetch("/api/sauce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      if (json.error) throw new Error(json.error);
      setHits(json.hits || []);
      if (!(json.hits || []).length)
        setError("No matches — try a clearer frame.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            e.preventDefault();
            searchByFile(f);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [searchByFile]);

  return (
    <div className="tools-panel">
      <p className="tools-hint" style={{ marginBottom: 16 }}>
        Drop, upload, paste (Ctrl+V), or URL. Powered by{" "}
        <a href="https://trace.moe" target="_blank" rel="noreferrer">
          trace.moe
        </a>
        .
      </p>

      <div
        className={"sauce-drop" + (dragOver ? " over" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && f.type.startsWith("image/")) searchByFile(f);
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="sauce-preview" />
        ) : (
          <p>Drop image here or paste from clipboard</p>
        )}
      </div>

      <form className="sauce-form" onSubmit={searchByUrl}>
        <label className="filter-label" htmlFor="sauce-url">
          Image URL
        </label>
        <div className="picker-row">
          <input
            id="sauce-url"
            className="filter-input"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-accent btn-sm"
            disabled={loading || !url.trim()}
          >
            {loading ? "Tracing…" : "Trace URL"}
          </button>
        </div>
      </form>

      <div className="sauce-upload">
        <label className="filter-label">Or upload a file</label>
        <input
          type="file"
          accept="image/*"
          disabled={loading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) searchByFile(f);
          }}
        />
      </div>

      {error ? (
        <div className="state-box error" style={{ marginTop: 16 }}>
          <p>{error}</p>
        </div>
      ) : null}

      {hits.length > 0 ? (
        <ul className="sauce-hits">
          {hits.slice(0, 8).map((h, i) => (
            <li key={`${h.anilistId}-${i}`} className="sauce-hit">
              {h.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.image} alt="" />
              ) : (
                <div className="sauce-hit-ph" />
              )}
              <div className="sauce-hit-body">
                <div className="sauce-sim">
                  {(h.similarity * 100).toFixed(1)}% match
                </div>
                <div className="sauce-file">{h.filename}</div>
                <div className="sauce-meta">
                  {h.episode != null ? `Ep ${h.episode} · ` : ""}
                  {formatTime(h.from)}–{formatTime(h.to)}
                </div>
                <div className="daily-actions" style={{ marginTop: 8 }}>
                  {h.anilistId ? (
                    <Link
                      href={`/anime/${h.anilistId}`}
                      className="btn btn-accent btn-sm"
                    >
                      Open on AnimeNexus
                    </Link>
                  ) : null}
                  {h.video ? (
                    <a
                      href={h.video}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      Preview clip
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
