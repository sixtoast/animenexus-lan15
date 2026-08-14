"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useWatchlist } from "@/components/WatchlistProvider";
import { mascotNotify } from "@/lib/mascot/store";
import { parseAppEventName } from "@/lib/mascot/ui-events";

/**
 * Bridges app reality into the Mascot Engine.
 * Sprint 12: semantic recommendation / watchlist / search events.
 */
export function ContextBridge() {
  const { entries, ready } = useWatchlist();
  const pathname = usePathname();
  const lastScroll = useRef({ y: 0, t: 0 });
  const prevLen = useRef<number | null>(null);
  const loadingSince = useRef<number | null>(null);

  // Empty / context
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
    // Watchlist add detection (length increased)
    if (prevLen.current != null && entries.length > prevLen.current) {
      mascotNotify({ type: "app-event", name: "watchlist-add" });
    } else if (prevLen.current != null && entries.length < prevLen.current) {
      mascotNotify({ type: "app-event", name: "watchlist-remove" });
    }
    prevLen.current = entries.length;
  }, [ready, entries.length, pathname]);

  // Custom events from app chrome
  useEffect(() => {
    const onLoading = (e: Event) => {
      const d = (e as CustomEvent).detail as { active?: boolean } | undefined;
      const active = !!d?.active;
      mascotNotify({ type: "loading", active });
      if (active) {
        loadingSince.current = Date.now();
      } else {
        loadingSince.current = null;
      }
    };
    const onError = () => mascotNotify({ type: "error" });
    const onTheme = (e: Event) => {
      const d = (e as CustomEvent).detail as { theme?: string } | undefined;
      if (d?.theme === "light" || d?.theme === "dark") {
        mascotNotify({ type: "theme", theme: d.theme });
      }
    };

    // Sprint 12 — forward known semantic events
    const SEMANTIC = [
      "animenexus:recommendation-generated",
      "animenexus:recommendation",
      "animenexus:recs-ready",
      "animenexus:recommendation-engaged",
      "animenexus:rec-click",
      "animenexus:recommendation-rejected",
      "animenexus:rec-dismiss",
      "animenexus:watchlist-add",
      "animenexus:search-empty",
      "animenexus:search-results",
      "animenexus:modal-open",
      "animenexus:modal-close",
      "animenexus:seal",
      "animenexus:complete",
    ];

    const onSemantic = (e: Event) => {
      const parsed = parseAppEventName(e.type);
      if (!parsed) return;
      // Map to store shapes
      if (parsed === "seal") {
        mascotNotify({ type: "seal" });
        return;
      }
      if (parsed === "complete") {
        mascotNotify({ type: "complete" });
        return;
      }
      if (parsed === "error") {
        mascotNotify({ type: "error" });
        return;
      }
      if (parsed === "scroll-fast") {
        mascotNotify({ type: "scroll-fast" });
        return;
      }
      if (parsed === "empty-list") {
        mascotNotify({ type: "empty-list" });
        return;
      }
      if (
        parsed === "recommendation-generated" ||
        parsed === "recommendation-engaged" ||
        parsed === "recommendation-rejected" ||
        parsed === "watchlist-add" ||
        parsed === "watchlist-remove" ||
        parsed === "search-empty" ||
        parsed === "search-results" ||
        parsed === "loading-long" ||
        parsed === "modal-open" ||
        parsed === "modal-close"
      ) {
        mascotNotify({ type: "app-event", name: parsed });
      }
    };

    window.addEventListener("animenexus:loading", onLoading);
    window.addEventListener("animenexus:error", onError);
    window.addEventListener("animenexus:theme", onTheme);
    for (const name of SEMANTIC) {
      window.addEventListener(name, onSemantic);
    }
    return () => {
      window.removeEventListener("animenexus:loading", onLoading);
      window.removeEventListener("animenexus:error", onError);
      window.removeEventListener("animenexus:theme", onTheme);
      for (const name of SEMANTIC) {
        window.removeEventListener(name, onSemantic);
      }
    };
  }, []);

  // Fast scroll
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

  // Loading / error DOM + long-load detection
  useEffect(() => {
    const check = () => {
      const err = document.querySelector(".state-box.error, .lantern-empty.error");
      if (err) mascotNotify({ type: "error" });
      const spin = document.querySelector(
        ".spinner, .loading-theater.active, [data-loading='true']",
      );
      const active = !!spin;
      mascotNotify({ type: "loading", active });
      if (active) {
        if (!loadingSince.current) loadingSince.current = Date.now();
        else if (Date.now() - loadingSince.current > 12_000) {
          mascotNotify({ type: "app-event", name: "loading-long" });
          loadingSince.current = Date.now(); // don't spam
        }
      } else {
        loadingSince.current = null;
      }

      // Empty search UI
      const emptySearch = document.querySelector(
        "[data-search-empty='true'], .search-empty, .no-results",
      );
      if (emptySearch) {
        mascotNotify({ type: "app-event", name: "search-empty" });
      }
    };
    const id = window.setInterval(check, 2500);
    check();
    return () => window.clearInterval(id);
  }, [pathname]);

  return null;
}
