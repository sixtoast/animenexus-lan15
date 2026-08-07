"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Soft room continuity — re-triggers enter animation on route change */
export function RoomEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick((t) => t + 1);
  }, [pathname]);

  return (
    <div key={tick} className="room-enter nx-room-tune">
      {children}
    </div>
  );
}
