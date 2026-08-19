"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { canViewTransition } from "@/lib/view-transition";

/** Soft room continuity — re-triggers enter animation on route change */
export function RoomEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tick, setTick] = useState(0);
  const [useCssEnter, setUseCssEnter] = useState(true);

  useEffect(() => {
    // When View Transitions API is active, root crossfade handles continuity;
    // skip the CSS room-enter to avoid double motion.
    setUseCssEnter(!canViewTransition());
    setTick((t) => t + 1);
  }, [pathname]);

  return (
    <div
      key={tick}
      className={
        useCssEnter ? "room-enter nx-room-tune" : "nx-room-tune room-enter-vt"
      }
    >
      {children}
    </div>
  );
}
