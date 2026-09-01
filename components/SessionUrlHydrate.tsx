"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hydrateSessionFromParams } from "@/lib/session-url";

/**
 * One-shot: if the URL carries experience/intensity/energy/minutes,
 * write them into the local intent session (soft cross-device share).
 */
export function SessionUrlHydrate() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    try {
      hydrateSessionFromParams(searchParams);
    } catch {
      /* */
    }
  }, [searchParams, pathname]);

  return null;
}
