"use client";

import { useEffect } from "react";
import {
  bondGreeting,
  memoryEmotionBias,
  noteSessionStart,
} from "@/lib/mascot/memory";
import { useMascotStore } from "@/lib/mascot/store";

/** Boot relationship memory once per mount (Sprint M9) */
export function MemoryBoot() {
  useEffect(() => {
    noteSessionStart();
    const bias = memoryEmotionBias();
    const store = useMascotStore.getState();
    for (const [k, v] of Object.entries(bias)) {
      if (typeof v === "number") {
        store.bumpEmotion(k as keyof typeof store.emotions, v);
      }
    }
    const greet = bondGreeting();
    if (greet) {
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("animenexus:mascot-thought", {
            detail: { text: greet },
          }),
        );
      }, 1400);
    }
  }, []);

  return null;
}
