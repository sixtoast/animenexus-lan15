"use client";

import { useMascotStore, mascotNotify } from "@/lib/mascot/store";

/**
 * Always-visible HTML lantern — works even when WebGL / R3F fails.
 * Primary companion affordance on mobile and low-power devices.
 */
export function LanternSprite() {
  const anim = useMascotStore((s) => s.anim);

  return (
    <button
      type="button"
      className={"lantern-sprite lantern-sprite--" + (anim || "idle")}
      aria-label="Pet Lantern-ko"
      title="Pet Lantern-ko"
      onClick={() => {
        try {
          mascotNotify({ type: "pet" });
        } catch {
          /* store may be mid-init */
        }
      }}
    >
      <span className="lantern-sprite-glow" aria-hidden />
      <span className="lantern-sprite-body" aria-hidden>
        <span className="lantern-sprite-head" />
        <span className="lantern-sprite-tip" />
        <span className="lantern-sprite-eye lantern-sprite-eye--l" />
        <span className="lantern-sprite-eye lantern-sprite-eye--r" />
      </span>
    </button>
  );
}
