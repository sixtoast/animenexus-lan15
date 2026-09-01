"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Announces soft route changes for screen readers. */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const title =
      document.title?.replace(/\s*·\s*AnimeNexus.*$/i, "") || pathname;
    const label =
      pathname === "/"
        ? "Home"
        : title || pathname.replace(/^\//, "").replace(/\//g, " · ");
    const t = window.setTimeout(() => setMsg(`Navigated to ${label}`), 120);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {msg}
    </div>
  );
}
