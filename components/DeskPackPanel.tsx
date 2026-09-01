"use client";

import { useEffect, useRef, useState } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  applyDeskPackMeta,
  applyDeskShareLite,
  buildDeskPack,
  decodeDeskShareLite,
  deskPackToJson,
  encodeDeskShareLite,
  parseDeskPack,
} from "@/lib/desk-pack";
import { playCue } from "@/lib/sound-engine";

export function DeskPackPanel() {
  const { entries, ready, replaceAll } = useWatchlist();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [includeShelf, setIncludeShelf] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const m = hash.match(/desk=([A-Za-z0-9_-]+)/);
    if (!m) return;
    const decoded = decodeDeskShareLite(m[1]);
    if (!decoded) return;
    const n = applyDeskShareLite(decoded);
    setMsg(`Imported desk share · ${n} note(s)`);
    playCue("success");
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);

  function downloadPack() {
    if (!ready) return;
    const pack = buildDeskPack(entries, { includeWatchlist: includeShelf });
    const blob = new Blob([deskPackToJson(pack)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `animenexus-desk-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playCue("success");
    setMsg("Desk pack downloaded");
  }

  async function copyShareLink() {
    const token = encodeDeskShareLite();
    const url = `${window.location.origin}/account#desk=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      playCue("success");
      setMsg("Share link copied (notes + session intent only)");
    } catch {
      setMsg("Could not copy — download the full pack instead");
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || "");
        const pack = parseDeskPack(raw);
        const report = applyDeskPackMeta(pack);
        if (pack.watchlist?.length) {
          replaceAll(pack.watchlist);
        }
        playCue("success");
        setMsg(
          `Applied pack · ${report.notes} notes · intent ${
            report.intent ? "yes" : "no"
          } · services ${report.services ? "yes" : "no"} · shelf ${
            report.watchlistIds
          }`,
        );
      } catch (e) {
        playCue("error");
        setMsg(e instanceof Error ? e.message : "Import failed");
      }
    };
    reader.readAsText(file);
  }

  return (
    <section className="desk-pack-panel detail-section">
      <h2>Desk pack</h2>
      <p className="tools-hint" style={{ marginBottom: 10 }}>
        Soft cross-device transfer — not cloud sync. Export notes, tonight intent,
        streaming prefs, and optionally your shelf as JSON. Share link carries
        notes + intent only.
      </p>
      <label
        className="tools-hint"
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <input
          type="checkbox"
          checked={includeShelf}
          onChange={(e) => setIncludeShelf(e.target.checked)}
        />
        Include watchlist in full pack
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          className="btn btn-accent btn-sm"
          onClick={downloadPack}
        >
          Download pack
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={copyShareLink}
        >
          Copy share link
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => fileRef.current?.click()}
        >
          Import pack
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </div>
      {msg ? (
        <p className="meta" style={{ marginTop: 10 }} role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
