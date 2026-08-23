"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
  /** Cap duration ms */
  duration?: number;
};

/** Soft tick only when value changes — not continuous spinner. */
export function CountTick({
  value,
  decimals = 0,
  suffix = "",
  className,
  duration = 420,
}: Props) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const reduced =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-reduce-motion") === "true";

  useEffect(() => {
    if (reduced || value === prev.current) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    const to = value;
    prev.current = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  const text =
    decimals > 0
      ? display.toFixed(decimals)
      : String(Math.round(display));

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
      {suffix}
    </span>
  );
}
