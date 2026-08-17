"use client";

import { useEffect } from "react";
import { touchSession } from "@/lib/lantern-memory";
import { installMemorySubscriber } from "@/lib/nexus/memory-subscriber";

/** One session touch + wire Nexus → memory when the shell mounts */
export function LanternMemoryBoot() {
  useEffect(() => {
    touchSession();
    installMemorySubscriber();
  }, []);
  return null;
}
