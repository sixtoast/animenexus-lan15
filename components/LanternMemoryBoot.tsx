"use client";

import { useEffect } from "react";
import { touchSession } from "@/lib/lantern-memory";

/** One session touch when the shell mounts */
export function LanternMemoryBoot() {
  useEffect(() => {
    touchSession();
  }, []);
  return null;
}
