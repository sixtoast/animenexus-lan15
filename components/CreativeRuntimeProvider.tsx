"use client";

import { useEffect } from "react";
import {
  applyCreativeTierToDocument,
  detectCreativeCapabilities,
  invalidateCreativeRuntime,
  sampleFrameStability,
} from "@/lib/creative-runtime";

/**
 * Bootstraps creative tier detection after hydration.
 * Samples short frame stability once; re-applies when motion prefs change
 * (via data-reduce-motion mutation observer).
 */
export function CreativeRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    invalidateCreativeRuntime();
    applyCreativeTierToDocument(detectCreativeCapabilities(true));
    // Defer FPS sample so first paint is not taxed
    const t = window.setTimeout(() => sampleFrameStability(900), 1200);

    const root = document.documentElement;
    const mo = new MutationObserver(() => {
      invalidateCreativeRuntime();
      applyCreativeTierToDocument(detectCreativeCapabilities(true));
    });
    mo.observe(root, {
      attributes: true,
      attributeFilter: ["data-reduce-motion", "data-motion"],
    });

    const onVis = () => {
      if (document.visibilityState === "visible") {
        invalidateCreativeRuntime();
        applyCreativeTierToDocument(detectCreativeCapabilities(true));
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearTimeout(t);
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <>{children}</>;
}
