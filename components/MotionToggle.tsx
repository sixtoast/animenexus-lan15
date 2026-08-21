"use client";

import { useMotion } from "@/components/MotionProvider";
import { Button } from "@/components/ui/Button";

/** Manual reduced-motion override (Sprint 34). */
export function MotionToggle() {
  const { reducedMotion, toggleMotion, ready } = useMotion();

  if (!ready) return null;

  return (
    <Button
      variant="icon"
      size="sm"
      onClick={toggleMotion}
      title={reducedMotion ? "Enable motion" : "Reduce motion"}
      aria-label={reducedMotion ? "Enable motion" : "Reduce motion"}
      aria-pressed={reducedMotion}
      className="motion-toggle-btn"
    >
      {reducedMotion ? "⏸" : "✦"}
    </Button>
  );
}
