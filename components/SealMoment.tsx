"use client";

import { useEffect, useRef, useState } from "react";

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

/** Quiet seal / complete moments — recognisable, not loud */
export function SealMomentHost() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("seal");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onSeal = (e: Event) => {
      const d = (e as CustomEvent).detail as Detail | undefined;
      const m: Mode =
        d?.mode === "watching" || d?.mode === "completed" ? d.mode : "seal";
      setTitle(d?.title || "Title");
      setMode(m);
      setOpen(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOpen(false), m === "completed" ? 2600 : 2200);
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
      className={"seal-moment" + (mode === "completed" ? " is-complete" : "")}
      role="status"
      aria-live="polite"
    >
      <div className="seal-card">
        <div className="seal-wax" aria-hidden>
          <span className="seal-wax-inner">{c.icon}</span>
        </div>
        <p className="seal-kicker">{c.kicker}</p>
        <p className="seal-title">{title}</p>
        <p className="seal-sub">{c.sub}</p>
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
