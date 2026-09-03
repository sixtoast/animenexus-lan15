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
import {
  applyPulledDeskPack,
  getOrCreateDeskDeviceKey,
  pullDeskCloud,
  pushDeskCloud,
  readDeskDeviceKey,
  writeDeskDeviceKey,
  isDeskCloudAutoPushEnabled,
  setDeskCloudAutoPushEnabled,
  linkDeskKeyToAniList,
} from "@/lib/desk-cloud";
import { useSession } from "@/components/SessionProvider";

export function DeskPackPanel() {
  const { entries, ready, replaceAll } = useWatchlist();
  const { session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [includeShelf, setIncludeShelf] = useState(true);
  const [deviceKey, setDeviceKey] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [autoPush, setAutoPush] = useState(false);

  useEffect(() => {
    setAutoPush(isDeskCloudAutoPushEnabled());
    if (session?.userId) {
      setDeviceKey(linkDeskKeyToAniList(session.userId));
    } else {
      setDeviceKey(getOrCreateDeskDeviceKey());
    }
  }, [session?.userId]);

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
          } · services ${
            report.services ? "yes" : "no"
          } · shelf ${
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

  async function cloudPush() {
    if (!ready || cloudBusy) return;
    setCloudBusy(true);
    setMsg(null);
    const r = await pushDeskCloud(entries, { includeWatchlist: includeShelf });
    setCloudBusy(false);
    if (r.ok) {
      playCue("success");
      setMsg("Cloud desk pushed · same device key restores on another browser");
      setDeviceKey(getOrCreateDeskDeviceKey());
    } else {
      playCue("error");
      setMsg(r.error);
    }
  }

  async function cloudPull() {
    if (cloudBusy) return;
    setCloudBusy(true);
    setMsg(null);
    const r = await pullDeskCloud();
    setCloudBusy(false);
    if (!r.ok) {
      playCue("error");
      setMsg(r.error);
      return;
    }
    const report = applyPulledDeskPack(r.pack);
    if (r.pack.watchlist?.length && replaceAll) {
      try {
        replaceAll(r.pack.watchlist);
      } catch {
        /* soft */
      }
    }
    playCue("success");
    setMsg(
      `Cloud desk pulled · ${report.notes} notes · intent ${
        report.intent ? "yes" : "no"
      } · services ${report.services ? "yes" : "no"} · shelf ${
        report.watchlistIds
      }${r.updatedAt ? ` · ${r.updatedAt}` : ""}`,
    );
  }

  function copyDeviceKey() {
    const k = getOrCreateDeskDeviceKey();
    setDeviceKey(k);
    void navigator.clipboard.writeText(k).then(
      () => {
        playCue("success");
        setMsg("Device key copied — paste it on another browser, then Pull");
      },
      () => setMsg(`Device key: ${k}`),
    );
  }

  function pasteDeviceKey() {
    const next = window.prompt("Paste desk device key from another browser");
    if (!next) return;
    if (writeDeskDeviceKey(next)) {
      setDeviceKey(readDeskDeviceKey() || next.trim());
      playCue("success");
      setMsg("Device key set — use Pull cloud desk");
    } else {
      playCue("error");
      setMsg("Invalid key (8+ letters/numbers)");
    }
  }

  return (
    <section className="desk-pack-panel detail-section">
      <h2>Desk pack</h2>
      <p className="tools-hint" style={{ marginBottom: 10 }}>
        Soft cross-device transfer. Export notes, tonight intent, streaming prefs,
        and optionally your shelf as JSON. Optional Supabase cloud push/pull uses
        a local device key (copy key → other browser → paste → pull). Share link
        still carries notes + intent only.
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
          checked={autoPush}
          onChange={(e) => {
            const on = e.target.checked;
            setAutoPush(on);
            setDeskCloudAutoPushEnabled(on);
            setMsg(
              on
                ? "Auto-push on · desk mirrors to cloud ~8s after changes (min 45s gap)"
                : "Auto-push off",
            );
          }}
        />
        Auto-push desk to cloud when this browser changes session dials / shelf
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
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={cloudBusy || !ready}
          onClick={() => void cloudPush()}
        >
          {cloudBusy ? "Cloud…" : "Push cloud desk"}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={cloudBusy}
          onClick={() => void cloudPull()}
        >
          Pull cloud desk
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={copyDeviceKey}
        >
          Copy device key
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={pasteDeviceKey}
        >
          Paste device key
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => onFile(e.target.files?.[0] || null)}
        />
      </div>
      {deviceKey ? (
        <p className="tools-hint" style={{ marginTop: 10 }}>
          Device key ·{" "}
          <code style={{ fontSize: "0.85em" }}>{deviceKey.slice(0, 8)}…</code>
        </p>
      ) : null}
      {msg ? (
        <p className="meta" style={{ marginTop: 10 }} role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
