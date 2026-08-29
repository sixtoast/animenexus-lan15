"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SauceHit } from "@/lib/sauce";
import { formatTime } from "@/lib/sauce";
import { preprocessSauceFile } from "@/lib/sauce-preprocess";
import { loadingStart, loadingStop } from "@/components/LoadingTheater";
import { Button } from "@/components/ui/Button";

type SaucePhase = "idle" | "prepare" | "search" | "done";

export function SauceClient() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [hits, setHits] = useState<SauceHit[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<SaucePhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [prepNote, setPrepNote] = useState<string | null>(null);

  const searchByFile = useCallback(async (file: File) => {
    setLoading(true);
    setPhase("prepare");
    setError(null);
    setHits([]);
    setProviders([]);
    setPrepNote(null);
    loadingStart("sauce");

    let previewUrl: string | null = null;
    try {
      // Local preview of original while we prepare
      const rawPreview = URL.createObjectURL(file);
      setPreview(rawPreview);

      const prepared = await preprocessSauceFile(file);
      URL.revokeObjectURL(rawPreview);
      previewUrl = prepared.previewUrl;
      setPreview(prepared.previewUrl);
      setPrepNote(
        `Prepared ${prepared.width}×${prepared.height} · ${(prepared.bytes / 1024).toFixed(0)} KB (metadata stripped)`,
      );

      setPhase("search");
      const form = new FormData();
      form.append("image", prepared.file);
      const res = await fetch("/api/sauce", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      if (json.error) throw new Error(json.error);
      setHits(json.hits || []);
      setProviders(json.providers || ["trace.moe"]);
      if (!(json.hits || []).length)
        setError("No matches — try a clearer frame.");
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setPhase("idle");
    } finally {
      setLoading(false);
      loadingStop();
    }
  }, []);

  async function searchByUrl(e?: React.FormEvent) {
    e?.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setPhase("search");
    loadingStart("sauce");
    setError(null);
    setHits([]);
    setProviders([]);
    setPrepNote(null);
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
      setProviders(json.providers || ["trace.moe"]);
      if (!(json.hits || []).length)
        setError("No matches — try a clearer frame.");
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setPhase("idle");
    } finally {
      setLoading(false);
      loadingStop();
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

  const phaseLabel =
    phase === "prepare"
      ? "Preparing frame…"
      : phase === "search"
        ? "Tracing…"
        : loading
          ? "Working…"
          : null;

  return (
    <div className="tools-panel">
      <p className="tools-hint" style={{ marginBottom: 16 }}>
        Drop, upload, paste (Ctrl+V), or URL. Primary:{" "}
        <a href="https://trace.moe" target="_blank" rel="noreferrer">
          trace.moe
        </a>
        . Screenshots are resized and metadata-stripped in your browser before
        the request — AnimeNexus does not keep your frames on Cloudinary.
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

      {phaseLabel ? (
        <p className="tools-hint sauce-phase" role="status" aria-live="polite">
          {phaseLabel}
          {prepNote && phase !== "prepare" ? ` · ${prepNote}` : null}
        </p>
      ) : prepNote ? (
        <p className="tools-hint sauce-phase">{prepNote}</p>
      ) : null}

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
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={loading || !url.trim()}
            loading={loading}
            silent
            riveKey="sauce_trace"
          >
            {loading ? "Tracing…" : "Trace URL"}
          </Button>
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

      {providers.length > 0 ? (
        <p className="tools-hint" style={{ marginTop: 12 }}>
          Providers: {providers.join(" · ")}
        </p>
      ) : null}

      {hits.length > 0 ? (
        <ul className="sauce-hits">
          {hits.slice(0, 8).map((h, i) => (
            <li key={`${h.anilistId}-${h.source}-${i}`} className="sauce-hit">
              {h.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.image} alt="" />
              ) : (
                <div className="sauce-hit-ph" />
              )}
              <div className="sauce-hit-body">
                <div className="sauce-sim">
                  {(h.similarity * 100).toFixed(1)}% · {h.confidence}
                  {" · "}
                  <span className="detail-source">{h.source}</span>
                </div>
                {h.title ? (
                  <div className="sauce-file">{h.title}</div>
                ) : null}
                <div className="sauce-file">{h.filename}</div>
                <div className="sauce-meta">
                  {h.episode != null ? `Ep ${h.episode}` : null}
                  {h.episode != null && (h.from || h.to) ? " · " : null}
                  {h.from || h.to
                    ? `${formatTime(h.from)}–${formatTime(h.to)}`
                    : null}
                </div>
                <div className="daily-actions" style={{ marginTop: 8 }}>
                  {h.anilistId ? (
                    <Link
                      href={`/anime/${h.anilistId}`}
                      className="btn btn-accent btn-sm"
                    >
                      Open on AnimeNexus
                    </Link>
                  ) : (
                    <span className="tools-hint">No AniList id on this hit</span>
                  )}
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
