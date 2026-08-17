"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { emitNexus } from "@/lib/nexus";

/** Map tool routes to stable tool ids for tool_opened events. */
function toolIdFromPath(path: string): string | null {
  if (!path.startsWith("/tools")) return null;
  if (path === "/tools") return "hub";
  const seg = path.slice("/tools/".length).split("/")[0];
  return seg || "hub";
}

/**
 * Emits page_viewed (and tool_opened when on /tools/*).
 * Mount once in the root layout — no UI.
 */
export function NexusRouteBeacon() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    emitNexus({ type: "page_viewed", path: pathname });
    const tool = toolIdFromPath(pathname);
    if (tool) {
      emitNexus({ type: "tool_opened", tool });
    }
  }, [pathname]);

  return null;
}
