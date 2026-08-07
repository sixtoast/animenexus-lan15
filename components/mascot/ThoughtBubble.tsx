"use client";

import { useEffect, useState } from "react";

/**
 * Soft, rare thought line near the dock (Sprint M8).
 * Listens for animenexus:mascot-thought — never spammy.
 */
export function ThoughtBubble() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let hide: number | undefined;
    let lastShow = 0;
    const onThought = (e: Event) => {
      const d = (e as CustomEvent).detail as { text?: string } | undefined;
      if (!d?.text) return;
      if (text) return;
      if (Date.now() - lastShow < 4000) return;
      if (Math.random() > 0.45) return;
      lastShow = Date.now();
      setText(d.text);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setText(null), 3200);
    };
    window.addEventListener("animenexus:mascot-thought", onThought);
    return () => {
      window.removeEventListener("animenexus:mascot-thought", onThought);
      window.clearTimeout(hide);
    };
  }, [text]);

  if (!text) return null;

  return (
    <div className="mascot-thought" role="status" aria-live="polite">
      {text}
    </div>
  );
}

export function emitThought(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("animenexus:mascot-thought", { detail: { text } }),
  );
}
