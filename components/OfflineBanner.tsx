"use client";

import { useEffect, useState } from "react";

/** Soft offline notice — app shell may still work from cache. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span>
        You’re offline — cached pages may still open. Catalog needs a signal.
      </span>
    </div>
  );
}
