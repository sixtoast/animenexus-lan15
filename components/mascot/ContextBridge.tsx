"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useWatchlist } from "@/components/WatchlistProvider";
import { mascotNotify } from "@/lib/mascot/store";

/**
 * Bridges app reality into the Mascot Engine (M8).
 * Listens for loading theater, theme, scroll, empty list, errors.
 */
export function ContextBridge() {
  const { entries, ready } = useWatchlist();
  const pathname = usePathname();
  const lastScroll = useRef({ y: 0, t: 0 });

  // Empty watchlist
  useEffect(() => {
    if (!ready) return;
    if (entries.length === 0) {
      mascotNotify({ type: "empty-list" });
      mascotNotify({ type: "context", context: "empty-list" });
    } else {
      const watching = entries.some((e) => e.watchStatus === "watching");
      mascotNotify({
        type: "context",
        context: watching ? "watching" : "browsing",
      });
    }
  }, [ready, entries.length, pathname]);

  // Custom events from app chrome
  useEffect(() => {
    const onLoading = (e: Event) => {
      const d = (e as CustomEvent).detail as { active?: boolean } | undefined;
      mascotNotify({ type: "loading", active: !!d?.active });
    };
    const onError = () => mascotNotify({ type: "error" });
    const onTheme = (e: Event) => {
      const d = (e as CustomEvent).detail as { theme?: string } | undefined;
      if (d?.theme === "light" || d?.theme === "dark") {
        mascotNotify({ type: "theme", theme: d.theme });
      }
    };

    window.addEventListener("animenexus:loading", onLoading);
    window.addEventListener("animenexus:error", onError);
    window.addEventListener("animenexus:theme", onTheme);
    return () => {
      window.removeEventListener("animenexus:loading", onLoading);
      window.removeEventListener("animenexus:error", onError);
      window.removeEventListener("animenexus:theme", onTheme);
    };
  }, []);

  // Fast scroll → lose balance (surprised)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const t = Date.now();
      const dy = Math.abs(y - lastScroll.current.y);
      const dt = t - lastScroll.current.t;
      lastScroll.current = { y, t };
      if (dt > 0 && dy / dt > 2.5) {
        mascotNotify({ type: "scroll-fast" });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Observe loading spinners / state-box.error in DOM
  useEffect(() => {
    const check = () => {
      const err = document.querySelector(".state-box.error, .lantern-empty.error");
      if (err) mascotNotify({ type: "error" });
      const spin = document.querySelector(
        ".spinner, .loading-theater.active, [data-loading='true']",
      );
      mascotNotify({ type: "loading", active: !!spin });
    };
    const id = window.setInterval(check, 2500);
    check();
    return () => window.clearInterval(id);
  }, [pathname]);

  return null;
}
