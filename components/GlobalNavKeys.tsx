"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { withViewTransition } from "@/lib/view-transition";

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  return Boolean(t.closest("[contenteditable='true'], [role='textbox']"));
}

/**
 * Single-letter navigation (no modifiers).
 * Does not steal A/Q/B (AI / Tonight / Break).
 */
export function GlobalNavKeys() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const k = e.key.toLowerCase();
      const map: Record<string, string> = {
        h: "/",
        w: "/watchlist",
        t: "/taste",
        r: "/browse",
        d: "/daily",
        s: "/seasonal",
        m: "/account",
      };
      const href = map[k];
      if (!href) return;
      e.preventDefault();
      withViewTransition(() => {
        router.push(href);
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
