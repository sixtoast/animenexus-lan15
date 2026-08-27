/**
 * Web Push preference helpers (API Expansion II Sprint 23).
 * Client-local opt-in; real delivery needs VAPID + server store (later).
 */

export const PUSH_PREF_KEY = "animenexus.push-prefs.v1";

export type PushPrefs = {
  /** User wants browser notifications when allowed */
  enabled: boolean;
  /** Categories — soft labels for future server filters */
  airing: boolean;
  streaming: boolean;
  radar: boolean;
  updatedAt: string;
};

export const defaultPushPrefs = (): PushPrefs => ({
  enabled: false,
  airing: true,
  streaming: true,
  radar: true,
  updatedAt: new Date().toISOString(),
});

export function readPushPrefs(): PushPrefs {
  if (typeof window === "undefined") return defaultPushPrefs();
  try {
    const raw = localStorage.getItem(PUSH_PREF_KEY);
    if (!raw) return defaultPushPrefs();
    const j = JSON.parse(raw) as Partial<PushPrefs>;
    return {
      ...defaultPushPrefs(),
      ...j,
      updatedAt: j.updatedAt || new Date().toISOString(),
    };
  } catch {
    return defaultPushPrefs();
  }
}

export function writePushPrefs(prefs: PushPrefs): void {
  try {
    localStorage.setItem(
      PUSH_PREF_KEY,
      JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
