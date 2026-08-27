"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultPushPrefs,
  readPushPrefs,
  urlBase64ToUint8Array,
  writePushPrefs,
  type PushPrefs,
} from "@/lib/push-prefs";

export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<PushPrefs>(defaultPushPrefs);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [vapidOk, setVapidOk] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrefs(readPushPrefs());
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    void fetch("/api/push/vapid")
      .then((r) => r.json())
      .then((j) => setVapidOk(Boolean(j.configured)))
      .catch(() => setVapidOk(false));
  }, []);

  const persist = useCallback((next: PushPrefs) => {
    setPrefs(next);
    writePushPrefs(next);
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setMsg("Notifications are not supported in this browser.");
        return;
      }
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        persist({ ...prefs, enabled: false });
        setMsg("Permission denied — notifications stay off.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription: PushSubscription | null = null;
      const nextPrefs = { ...prefs, enabled: true };

      if (vapidOk) {
        const vapid = await fetch("/api/push/vapid").then((r) => r.json());
        if (vapid.publicKey) {
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              vapid.publicKey,
            ) as BufferSource,
          });
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: subscription.toJSON(),
              prefs: nextPrefs,
            }),
          });
        }
      }

      persist(nextPrefs);
      setMsg(
        vapidOk && subscription
          ? "Notifications enabled. Categories and quiet hours apply on the server when prefs are stored."
          : "Permission granted. Local prefs saved. Add VAPID keys for remote push.",
      );

      if (reg.showNotification) {
        await reg.showNotification("AnimeNexus", {
          body: "Notifications are ready when signals arrive.",
          icon: "/icon.svg",
          tag: "animenexus-welcome",
          data: { url: "/tools/radar" },
        });
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not enable notifications.");
      persist({ ...prefs, enabled: false });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      persist({ ...prefs, enabled: false });
      setMsg("Notifications disabled on this device.");
    } catch {
      persist({ ...prefs, enabled: false });
    } finally {
      setBusy(false);
    }
  }

  async function syncPrefsToServer() {
    setBusy(true);
    setMsg(null);
    try {
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setMsg("No active subscription — enable notifications first.");
        return;
      }
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          prefs,
        }),
      });
      setMsg("Prefs synced to server for this browser.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  if (permission === "unsupported") {
    return (
      <p className="account-note">
        This browser does not support the Notifications API.
      </p>
    );
  }

  return (
    <div>
      <p className="account-note">
        Opt-in only. Categories and quiet hours filter remote pushes when your
        subscription is stored with prefs.
      </p>
      <p className="tools-hint" style={{ marginBottom: 10 }}>
        Permission: <strong>{permission}</strong>
        {" · "}
        VAPID: {vapidOk ? "configured" : "not set"}
      </p>
      <div className="account-actions" style={{ flexWrap: "wrap", gap: 8 }}>
        {!prefs.enabled ? (
          <button
            type="button"
            className="btn btn-accent btn-sm"
            disabled={busy}
            onClick={() => void enable()}
          >
            Enable notifications
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => void disable()}
            >
              Disable notifications
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => void syncPrefsToServer()}
            >
              Sync prefs to server
            </button>
          </>
        )}
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {(
          [
            ["airing", "Episode air times"],
            ["streaming", "Streaming availability changes"],
            ["radar", "Radar / watchlist signals"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}
          >
            <input
              type="checkbox"
              checked={prefs[key]}
              disabled={!prefs.enabled}
              onChange={(e) =>
                persist({ ...prefs, [key]: e.target.checked })
              }
            />
            {label}
          </label>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <p className="tools-hint" style={{ marginBottom: 8 }}>
          Quiet hours (local clock). Leave both blank to disable.
        </p>
        <div className="account-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13 }}>
            From{" "}
            <select
              className="filter-input"
              style={{ width: 72 }}
              disabled={!prefs.enabled}
              value={prefs.quietStartHour ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                persist({
                  ...prefs,
                  quietStartHour: v === "" ? null : parseInt(v, 10),
                });
              }}
            >
              <option value="">—</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            To{" "}
            <select
              className="filter-input"
              style={{ width: 72 }}
              disabled={!prefs.enabled}
              value={prefs.quietEndHour ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                persist({
                  ...prefs,
                  quietEndHour: v === "" ? null : parseInt(v, 10),
                });
              }}
            >
              <option value="">—</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {msg ? (
        <p className="tools-hint" style={{ marginTop: 10 }}>
          {msg}
        </p>
      ) : null}
    </div>
  );
}
