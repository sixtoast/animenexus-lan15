"use client";

import { useEffect } from "react";
import { writeIntentSession } from "@/lib/intent-session";

/** Deep link /mood/[slug] → persist session pack (soft). */
export function MoodSessionBoot({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    writeIntentSession({ slug });
  }, [slug]);
  return null;
}
