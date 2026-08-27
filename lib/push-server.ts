/**
 * Web Push send pipeline (Sprints 25 + 29).
 * Soft-fail without VAPID. Optional category / quiet-hour filters from stored prefs.
 */

import webpush from "web-push";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
    console.warn("[push] supabase upsert", error.message);
  }

  memorySubs.set(sub.endpoint, stored);
  return { stored: "memory" };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  memorySubs.delete(endpoint);
  const sb = getServiceSupabase();
  if (sb) {
    await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
}

export async function listStoredSubscriptions(): Promise<StoredPushSub[]> {
  const out = new Map<string, StoredPushSub>();
  for (const [k, v] of memorySubs) out.set(k, v);

  const sb = getServiceSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, prefs")
      .limit(500);
    if (!error && data) {
      for (const row of data) {
        if (!row.endpoint) continue;
        out.set(row.endpoint, {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.p256dh || undefined,
            auth: row.auth || undefined,
          },
          prefs: (row.prefs as Record<string, unknown>) || {},
        });
      }
    }
  }
  return [...out.values()];
}

export async function listPushSubscriptions(): Promise<PushSubscriptionJSON[]> {
  return listStoredSubscriptions();
}

function allowsCategory(
  prefs: StoredPushSub["prefs"],
  category?: PushPayload["category"],
): boolean {
  if (!category || category === "system") return true;
  if (!prefs) return true;
  if (prefs.enabled === false) return false;
  const flag = prefs[category];
  if (typeof flag === "boolean") return flag;
  return true;
}

function inQuiet(prefs: StoredPushSub["prefs"]): boolean {
  if (!prefs) return false;
  return isInQuietHours({
    quietStartHour:
      typeof prefs.quietStartHour === "number" ? prefs.quietStartHour : null,
    quietEndHour:
      typeof prefs.quietEndHour === "number" ? prefs.quietEndHour : null,
  });
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
    return { sent: 0, failed: 0, skipped: "VAPID not configured", filtered: 0 };
  }

  const subs = await listStoredSubscriptions();
  if (!subs.length) {
    return { sent: 0, failed: 0, skipped: "no subscriptions", filtered: 0 };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/tools/signals",
    tag: payload.tag || "animenexus-signal",
  });

  let sent = 0;
  let failed = 0;
  let filtered = 0;

  await Promise.all(
    subs.map(async (sub) => {
      if (!allowsCategory(sub.prefs, payload.category) || inQuiet(sub.prefs)) {
        filtered += 1;
        return;
      }
      if (!sub.keys?.p256dh || !sub.keys?.auth) {
        failed += 1;
        return;
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
        sent += 1;
      } catch (e: unknown) {
        failed += 1;
        const status =
          e && typeof e === "object" && "statusCode" in e
            ? Number((e as { statusCode: number }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          await removePushSubscription(sub.endpoint);
        }
        console.warn(
          "[push] send failed",
          status || (e instanceof Error ? e.message : e),
        );
      }
    }),
  );

  return { sent, failed, skipped: null, filtered };
}
