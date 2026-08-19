"use client";

import { useEffect } from "react";
import { readMemory, touchSession } from "@/lib/lantern-memory";
import { installMemorySubscriber } from "@/lib/nexus/memory-subscriber";
import { writeSessionTouch } from "@/components/FirstVisitHost";

/** One session touch + wire Nexus → memory when the shell mounts */
export function LanternMemoryBoot() {
  useEffect(() => {
    const before = readMemory();
    const isFirstVisit = !before.firstSeenAt;
    let daysAway = 0;
    if (before.lastVisitAt) {
      const ms = Date.now() - new Date(before.lastVisitAt).getTime();
      if (Number.isFinite(ms) && ms > 0) {
        daysAway = ms / (1000 * 60 * 60 * 24);
      }
    }
    const m = touchSession();
    writeSessionTouch({
      isFirstVisit,
      daysAway,
      sessionOpens: m.sessionOpens,
    });
    installMemorySubscriber();
  }, []);
  return null;
}
