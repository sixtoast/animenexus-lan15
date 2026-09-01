"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hydrateSessionFromParams } from "@/lib/session-url";
import { useToast } from "@/components/ToastProvider";
import { getExperienceIntent } from "@/lib/viewing-intent";
import { playCue } from "@/lib/sound-engine";

/**
 * If the URL carries experience/intensity/energy/minutes,
 * write them into the local intent session (soft cross-device share).
 */
export function SessionUrlHydrate() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { showToast } = useToast();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const has =
      searchParams.get("experience") ||
      searchParams.get("intensity") ||
      searchParams.get("energy") ||
      searchParams.get("minutes");
    if (!has) return;

    try {
      const next = hydrateSessionFromParams(searchParams);
      if (!next) return;
      done.current = true;

      const key = `an_session_hydrate_${searchParams.toString()}`;
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) {
        return;
      }
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        /* */
      }

      const exp = next.slug ? getExperienceIntent(next.slug) : null;
      const bits: string[] = [];
      if (exp?.label) bits.push(exp.label);
      else if (next.slug) bits.push(next.slug);
      if (next.intensity !== "moderate") bits.push(`${next.intensity} intensity`);
      if (next.energy !== "medium") bits.push(`${next.energy} energy`);
      if (next.minutesAvailable) bits.push(`~${next.minutesAvailable}m`);

      showToast(
        bits.length
          ? `Session applied · ${bits.join(" · ")}`
          : "Session applied from link",
        "✦",
        true,
      );
      playCue("success");
    } catch {
      /* */
    }
  }, [searchParams, pathname, showToast]);

  return null;
}
