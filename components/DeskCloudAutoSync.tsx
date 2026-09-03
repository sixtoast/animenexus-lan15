"use client";

import { useEffect, useRef } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/ToastProvider";
import {
  applyPulledDeskPack,
  isDeskCloudAutoPushEnabled,
  linkDeskKeyToAniList,
  pullDeskCloud,
  pushDeskCloud,
} from "@/lib/desk-cloud";

const PULL_MARK = "animenexus.desk_cloud.pulled_user.v1";

/**
 * Debounced optional cloud mirror when auto-push is enabled on Account.
 * Also: pull desk once when AniList session appears and cloud has a row.
 * Soft-fail: never blocks UI.
 */
export function DeskCloudAutoSync() {
  const { entries, ready, replaceAll } = useWatchlist();
  const { session } = useSession();
  const { showToast } = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPush = useRef(0);
  const pullInFlight = useRef(false);

  // Link key + one-shot pull when AniList session appears
  useEffect(() => {
    if (!session?.userId || !ready) return;

    let cancelled = false;

    try {
      linkDeskKeyToAniList(session.userId);
    } catch {
      /* */
    }

    const userKey = String(session.userId);
    try {
      if (sessionStorage.getItem(PULL_MARK) === userKey) return;
    } catch {
      /* still try pull */
    }

    if (pullInFlight.current) return;
    pullInFlight.current = true;

    void (async () => {
      try {
        const r = await pullDeskCloud();
        if (cancelled) return;
        if (!r.ok) {
          // empty / unconfigured — quiet
          try {
            sessionStorage.setItem(PULL_MARK, userKey);
          } catch {
            /* */
          }
          return;
        }

        const report = applyPulledDeskPack(r.pack);
        if (r.pack.watchlist?.length) {
          try {
            replaceAll(r.pack.watchlist);
          } catch {
            /* soft */
          }
        }

        try {
          sessionStorage.setItem(PULL_MARK, userKey);
        } catch {
          /* */
        }

        const bits: string[] = [];
        if (report.notes) bits.push(`${report.notes} notes`);
        if (report.intent) bits.push("intent");
        if (report.services) bits.push("services");
        if (report.watchlistIds) bits.push(`${report.watchlistIds} shelf`);
        showToast(
          bits.length
            ? `Cloud desk restored · ${bits.join(" · ")}`
            : "Cloud desk restored",
          { tone: "success", emoji: "☁" },
        );
      } catch {
        /* soft */
      } finally {
        pullInFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.userId, ready, replaceAll, showToast]);

  // Auto-push when enabled
  useEffect(() => {
    if (!ready) return;
    if (!isDeskCloudAutoPushEnabled()) return;

    const schedule = () => {
      if (!isDeskCloudAutoPushEnabled()) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const now = Date.now();
        if (now - lastPush.current < 45_000) return;
        lastPush.current = now;
        void pushDeskCloud(entries, { includeWatchlist: true }).then((r) => {
          if (!r.ok && typeof console !== "undefined") {
            console.info("[desk-cloud] auto-push skipped:", r.error);
          }
        });
      }, 8_000);
    };

    schedule();

    const onIntent = () => schedule();
    window.addEventListener("animenexus:intent", onIntent);
    return () => {
      window.removeEventListener("animenexus:intent", onIntent);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [entries, ready]);

  return null;
}
