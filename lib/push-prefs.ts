/**
 * Web Push preference helpers (Sprints 23 + 29).
 * Client-local opt-in; prefs also posted with subscription for server filters.
 */

export const PUSH_PREF_KEY = "animenexus.push-prefs.v1";

export type PushPrefs = {
  /** User wants browser notifications when allowed */
  enabled: boolean;
  /** Categories — server may filter when stored with subscription */
  airing: boolean;
  streaming: boolean;
  radar: boolean;
  /** Quiet hours (local clock, soft) — 0–23 inclusive start, exclusive end */
  quietStartHour: number | null;
  quietEndHour: number | null;
  updatedAt: string;
};

export const defaultPushPrefs = (): PushPrefs => ({
  enabled: false,
  airing: true,
  streaming: true,
  radar: true,
  quietStartHour: null,
  quietEndHour: null,
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
      quietStartHour:
        j.quietStartHour == null || Number.isNaN(Number(j.quietStartHour))
          ? null
          : Math.min(23, Math.max(0, Number(j.quietStartHour))),
      quietEndHour:
        j.quietEndHour == null || Number.isNaN(Number(j.quietEndHour))
          ? null
          : Math.min(23, Math.max(0, Number(j.quietEndHour))),
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

/**
 * Quiet window may wrap midnight (e.g. 22 → 7).
 * Returns true if local hour is inside quiet range.
 */
export function isInQuietHours(
  prefs: Pick<PushPrefs, "quietStartHour" | "quietEndHour">,
  now = new Date(),
): boolean {
  const s = prefs.quietStartHour;
  const e = prefs.quietEndHour;
  if (s == null || e == null) return false;
  const h = now.getHours();
  if (s === e) return true; // 24h quiet
  if (s < e) return h >= s && h < e;
  return h >= s || h < e;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
