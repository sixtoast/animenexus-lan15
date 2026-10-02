"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const y = event.touches[0]?.clientY ?? 0;
      const previousY = Number(document.documentElement.dataset.nxTouchY || y);
      const deltaY = y - previousY;
      document.documentElement.dataset.nxTouchY = String(y);
      if (window.scrollY <= 0 && deltaY > 0) event.preventDefault();
    };
    const onTouchEnd = () => {
      delete document.documentElement.dataset.nxTouchY;
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);
  return null;
}
