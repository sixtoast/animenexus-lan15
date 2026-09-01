"use client";

import { useEffect, useState } from "react";
import { playCue } from "@/lib/sound-engine";

/** Floating control after deep scroll — soft a11y affordance. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="back-to-top"
      aria-label="Back to top"
      onClick={() => {
        playCue("ui_tap");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      ↑
    </button>
  );
}
