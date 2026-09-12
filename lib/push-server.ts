/**
 * Web Push send pipeline (Sprints 25 + 29).
 * Soft-fail without VAPID. Optional category / quiet-hour filters from stored prefs.
 */

import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isInQuietHours, type PushPrefs } from "./push-prefs";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
};

export type StoredPushSub = PushSubscriptionJSON & {
  prefs?: Partial<PushPrefs> & Record<string, unknown>;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  /** Filter against subscription prefs */
  category?: "airing" | "streaming" | "radar" | "system";
};

const memorySubs = new Map<string, StoredPushSub>();

export function isVapidReady(): boolean {
  return Boolean(
    (process.env.VAPID_PUBLIC_KEY || "").trim() &&
      (process.env.VAPID_PRIVATE_KEY || "").trim(),
  );
}

function configureWebPush(): boolean {
  if (!isVapidReady()) return false;
  const subject =
    (process.env.VAPID_SUBJECT || "").trim() || "mailto:admin@animenexus.local";
  webpush.setVapidDetails(
    subject,
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  return true;
}

function getServiceSupabase(): SupabaseClient | null {
  return getSupabaseServerClient();
}

export async function savePushSubscription(
  sub: PushSubscriptionJSON,
  prefs?: Record<string, unknown>,
): Promise<{ stored: "supabase" | "memory" | "none"; error?: string }> {
  if (!sub?.endpoint) return { stored: "none", error: "missing endpoint" };

  const stored: StoredPushSub = { ...sub, prefs: prefs || {} };

  const sb = getServiceSupabase();
  if (sb) {
    const { error } = await sb.from("push_subscriptions").upsert(
      {
        endpoint: sub.endpoint,
        p256dh: sub.keys?.p256dh || null,
        auth: sub.keys?.auth || null,
        prefs: prefs || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (!error) {
      memorySubs.set(sub.endpoint, stored);
      return { stored: "supabase" };
    }
    return { stored: "memory", error: error.message };
  }

  memorySubs.set(sub.endpoint, stored);
  return { stored: "memory" };
}

export async function removePushSubscription(
  endpoint: string,
): Promise<void> {
  memorySubs.delete(endpoint);
  const sb = getServiceSupabase();
  if (sb) {
    await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
}

async function loadSubs(): Promise<StoredPushSub[]> {
  const sb = getServiceSupabase();
  if (sb) {
    const { data } = await sb.from("push_subscriptions").select("*");
    if (data?.length) {
      return data.map((row) => ({
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh || undefined,
          auth: row.auth || undefined,
        },
        prefs: (row.prefs as StoredPushSub["prefs"]) || {},
      }));
    }
  }
  return [...memorySubs.values()];
}

function shouldSend(
  sub: StoredPushSub,
  payload: PushPayload,
): boolean {
  const prefs = (sub.prefs || {}) as Partial<PushPrefs>;
  if (prefs.enabled === false) return false;

  // PushPrefs stores category toggles as top-level booleans (airing / streaming / radar)
  if (payload.category && payload.category !== "system") {
    const cat = payload.category;
    if (prefs[cat] === false) return false;
  }

  if (isInQuietHours(prefs)) return false;
  return true;
}

export async function sendPushToAll(
  payload: PushPayload,
): Promise<{
  sent: number;
  failed: number;
  skipped: string | null;
  filtered: number;
}> {
  if (!configureWebPush()) {
    return {
      sent: 0,
      failed: 0,
      skipped: "VAPID not configured",
      filtered: 0,
    };
  }

  const subs = await loadSubs();
  let sent = 0;
  let failed = 0;
  let filtered = 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag || "animenexus",
  });

  for (const sub of subs) {
    if (!shouldSend(sub, payload)) {
      filtered++;
      continue;
    }
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      failed++;
      continue;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        body,
      );
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed, skipped: null, filtered };
}
