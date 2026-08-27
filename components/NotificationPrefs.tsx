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
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
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
              prefs: { ...prefs, enabled: true },
            }),
          });
        }
      }

      persist({ ...prefs, enabled: true });
      setMsg(
        vapidOk && subscription
          ? "Notifications enabled. Server can target this browser once push delivery is wired."
          : "Permission granted. Local prefs saved. Add VAPID_PUBLIC_KEY for push subscribe.",
      );

      // Local smoke test — not a remote push
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
        Opt-in only. We never request permission until you enable here. Real
        remote pushes need server VAPID keys; until then prefs and the service
        worker handlers are ready.
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
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() => void disable()}
          >
            Disable notifications
          </button>
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
      {msg ? (
        <p className="tools-hint" style={{ marginTop: 10 }}>
          {msg}
        </p>
      ) : null}
    </div>
  );
}
