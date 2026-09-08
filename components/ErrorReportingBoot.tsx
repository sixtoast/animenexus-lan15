"use client";

import { useEffect } from "react";
import { installClientErrorHooks } from "@/lib/report-error";

/** Installs window error hooks when a Sentry DSN is configured. */
export function ErrorReportingBoot() {
  useEffect(() => {
    return installClientErrorHooks();
  }, []);
  return null;
}
