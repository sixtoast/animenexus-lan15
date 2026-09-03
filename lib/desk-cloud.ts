/**
 * Soft desk cloud — optional Supabase mirror of desk pack.
 * LocalStorage + desk pack remain primary. Cloud is progressive enhancement.
 */

import {
  applyDeskPackMeta,
  buildDeskPack,
  type DeskPack,
  parseDeskPack,
} from "@/lib/desk-pack";
import type { WatchlistEntry } from "@/lib/types";

const DEVICE_KEY = "animenexus.desk_cloud.device_key.v1";
const AUTO_KEY = "animenexus.desk_cloud.auto_push.v1";

export function getOrCreateDeskDeviceKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let k = localStorage.getItem(DEVICE_KEY);
    if (k && /^[a-zA-Z0-9_-]{8,128}$/.test(k)) return k;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    k = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_KEY, k);
    return k;
  } catch {
    return `anon_${Date.now().toString(36)}`;
  }
}

export function readDeskDeviceKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const k = localStorage.getItem(DEVICE_KEY);
    return k && k.length >= 8 ? k : null;
  } catch {
    return null;
  }
}

/** Replace device key (e.g. paste key from another browser to pull same cloud row). */
export function writeDeskDeviceKey(key: string): boolean {
  if (typeof window === "undefined") return false;
  const k = key.trim().slice(0, 128);
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(k)) return false;
  try {
    localStorage.setItem(DEVICE_KEY, k);
    return true;
  } catch {
    return false;
  }
}

export type DeskCloudPushResult =
  | { ok: true; source: string }
  | { ok: false; error: string };

export async function pushDeskCloud(
  entries: WatchlistEntry[],
  opts?: { includeWatchlist?: boolean },
): Promise<DeskCloudPushResult> {
  const key = getOrCreateDeskDeviceKey();
  if (!key) return { ok: false, error: "No device key" };
  const pack = buildDeskPack(entries, {
    includeWatchlist: opts?.includeWatchlist !== false,
  });
  try {
    const res = await fetch("/api/desk-cloud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, pack }),
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      source?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error: j.error || `HTTP ${res.status}`,
      };
    }
    return { ok: true, source: j.source || "supabase" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export type DeskCloudPullResult =
  | {
      ok: true;
      pack: DeskPack;
      updatedAt: string | null;
      source: string;
    }
  | { ok: false; error: string; empty?: boolean };

export async function pullDeskCloud(): Promise<DeskCloudPullResult> {
  const key = getOrCreateDeskDeviceKey();
  if (!key) return { ok: false, error: "No device key" };
  try {
    const res = await fetch(
      `/api/desk-cloud?key=${encodeURIComponent(key)}`,
    );
    const j = (await res.json().catch(() => ({}))) as {
      pack?: unknown;
      updatedAt?: string | null;
      source?: string;
      error?: string;
      message?: string;
    };
    if (j.source === "unconfigured") {
      return { ok: false, error: "Supabase not configured" };
    }
    if (!j.pack) {
      return { ok: false, error: "No cloud desk for this key yet", empty: true };
    }
    // Validate shape via parse
    const pack = parseDeskPack(JSON.stringify(j.pack));
    return {
      ok: true,
      pack,
      updatedAt: j.updatedAt ?? null,
      source: j.source || "supabase",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

/** Apply pulled pack meta; watchlist merge left to caller. */
export function applyPulledDeskPack(pack: DeskPack) {
  return applyDeskPackMeta(pack);
}

export function isDeskCloudAutoPushEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTO_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDeskCloudAutoPushEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTO_KEY, on ? "1" : "0");
  } catch {
    /* */
  }
}

/**
 * Prefer a stable AniList-linked key when signed in (quick or OAuth).
 * Format: al_<userId> — falls back to random device key.
 */
export function linkDeskKeyToAniList(userId: number | string | null | undefined): string {
  const base = getOrCreateDeskDeviceKey();
  if (userId == null || userId === "") return base;
  const id = String(userId).replace(/\D/g, "").slice(0, 16);
  if (!id) return base;
  const linked = `al_${id}`;
  writeDeskDeviceKey(linked);
  return linked;
}
