"use client";

import { useEffect, useRef } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useSession } from "@/components/SessionProvider";
import {
  isDeskCloudAutoPushEnabled,
  linkDeskKeyToAniList,
  pushDeskCloud,
} from "@/lib/desk-cloud";

/**
 * Debounced optional cloud mirror when auto-push is enabled on Account.
 * Soft-fail: never blocks UI; skips when unconfigured or offline.
 */
export function DeskCloudAutoSync() {
  const { entries, ready } = useWatchlist();
  const { session } = useSession();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPush = useRef(0);

  // Link key to AniList user id when session appears
  useEffect(() => {
    if (!session?.userId) return;
    try {
      linkDeskKeyToAniList(session.userId);
    } catch {
      /* */
    }
  }, [session?.userId]);

  useEffect(() => {
    if (!ready) return;
    if (!isDeskCloudAutoPushEnabled()) return;

    const schedule = () => {
      if (!isDeskCloudAutoPushEnabled()) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const now = Date.now();
        // min 45s between pushes
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
