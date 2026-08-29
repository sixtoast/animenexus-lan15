"use client";

import { useEffect, useRef, useState } from "react";
import { creativeAllowsLottie } from "@/lib/creative-runtime";

export type NexusLottieProps = {
  /** public path to .lottie or .json — optional */
  src?: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  /** When false, show static fallback only */
  play?: boolean;
  label?: string;
  fallback?: React.ReactNode;
  height?: number;
  width?: number;
};

/**
 * Soft Lottie/dotLottie host (Sprint 8 shell + Sprint 11 use).
 * No runtime dependency required: missing src / MINIMAL / reduced motion → fallback.
 * When a .lottie player is added later, swap the inner renderer only.
 */
export function NexusLottie({
  src,
  className = "",
  loop = false,
  autoplay = true,
  play = true,
  label = "Illustration",
  fallback,
  height = 96,
  width = 96,
}: NexusLottieProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(!!e?.isIntersecting),
      { rootMargin: "48px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const allow =
    creativeAllowsLottie() &&
    play &&
    !!src &&
    !failed &&
    visible;

  // Soft probe: if src 404s we stay on fallback (no hard error)
  useEffect(() => {
    if (!src || !allow) return;
    let cancelled = false;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        if (!cancelled && !r.ok) setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src, allow]);

  return (
    <div
      ref={ref}
      className={`nx-lottie ${className}`.trim()}
      style={{ width, height }}
      role="img"
      aria-label={label}
      data-lottie-loop={loop || undefined}
      data-lottie-autoplay={autoplay || undefined}
    >
      {/* Player slot reserved — CSS/illustration fallback is product-safe today */}
      <div className="nx-lottie-fallback" aria-hidden>
        {fallback ?? <span className="nx-lottie-dot" />}
      </div>
    </div>
  );
}
