"use client";

/**
 * Dev-only: install window.__mascotDebug()
 * Mount once from LiveTerrain (or any mascot host).
 */

import { useEffect } from "react";
import { installMascotDebugGlobal } from "@/lib/mascot/debug-snapshot";

export function MascotDebugBoot() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      installMascotDebugGlobal();
    }
  }, []);
  return null;
}
