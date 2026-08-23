"use client";

import { useEffect, useRef, useState } from "react";
import { playCue } from "@/lib/sound-engine";

type Mode = "seal" | "watching" | "completed";

type Detail = {
  title?: string;
  mode?: Mode;
};

const COPY: Record<
  Mode,
  { kicker: string; sub: string; icon: string }
> = {
  seal: {
    kicker: "Sealed by Lantern",
    sub: "Added to your shelf. The desk remembers.",
    icon: "🕯️",
  },
  watching: {
    kicker: "Channel locked",
    sub: "Progress lives on your shelf.",
    icon: "▶",
  },
  completed: {
    kicker: "Story closed",
    sub: "Quiet finish. Lantern filed this with the rest.",
    icon: "✦",
  },
};

/** Rapid seals within this window use mini ceremony. */
const RAPID_MS = 2800;

/** Quiet seal / complete moments — recognisable, not loud */
export function SealMomentHost() {
  const [open, setOpen] = useState(false);
  const [mini, setMini] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("seal");
  const timer = useRef<number | null>(null);
  const lastFull = useRef(0);

  useEffect(() => {
    const onSeal = (e: Event) => {
      const d = (e as CustomEvent).detail as Detail | undefined;
      const m: Mode =
        d?.mode === "watching" || d?.mode === "completed" ? d.mode : "seal";
      const now = Date.now();
      const useMini = now - lastFull.current < RAPID_MS && m === "seal";

      setTitle(d?.title || "Title");
      setMode(m);
      setMini(useMini);
      setOpen(true);

      // Sound after persistence already succeeded (callers fire post-write)
      if (m === "completed") playCue("complete");
      else if (m === "watching") playCue("seal");
      else playCue("seal");

      if (!useMini) lastFull.current = now;

      // Warm ambient kiss
      document.documentElement.setAttribute("data-seal-ambient", "1");
      window.setTimeout(() => {
        document.documentElement.removeAttribute("data-seal-ambient");
      }, 280);

      if (timer.current) window.clearTimeout(timer.current);
      const hold = useMini ? 1100 : m === "completed" ? 2800 : 2400;
      timer.current = window.setTimeout(() => setOpen(false), hold);
    };
    window.addEventListener("animenexus:seal", onSeal);
    return () => {
      window.removeEventListener("animenexus:seal", onSeal);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  if (!open) return null;

  const c = COPY[mode];

  return (
    <div
      className={
        "seal-moment" +
        (mode === "completed" ? " is-complete" : "") +
        (mini ? " is-mini" : "")
      }
      role="status"
      aria-live="polite"
    >
      <div className="seal-card">
        <div className="seal-ring" aria-hidden />
        <div className="seal-wax" aria-hidden>
          <span className="seal-wax-inner">{c.icon}</span>
        </div>
        <p className="seal-kicker">{c.kicker}</p>
        <p className="seal-title">{title}</p>
        {!mini ? <p className="seal-sub">{c.sub}</p> : null}
      </div>
    </div>
  );
}

export function fireSeal(title: string, mode: Mode = "seal") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("animenexus:seal", { detail: { title, mode } }),
  );
  window.dispatchEvent(new CustomEvent("animenexus:lantern-pulse"));
}
