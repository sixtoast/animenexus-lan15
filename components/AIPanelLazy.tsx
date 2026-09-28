"use client";

import { AIPanel } from "@/components/AIPanel";

/**
 * Keep the AI trigger mounted at all times.
 *
 * The previous lazy wrapper swapped the trigger button out immediately on
 * click and only then loaded the real panel. If the dynamic chunk was slow
 * or failed, the button disappeared while no panel was rendered. That made
 * the AI desk appear completely broken.
 *
 * AIPanel is already client-only, and its expensive work is deferred until
 * the desk is actually used, so keeping the shell mounted is safer and keeps
 * the trigger persistent.
 */
export function AIPanelLazy() {
  return <AIPanel />;
}
