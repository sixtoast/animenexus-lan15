"use client";

import { useEffect } from "react";

type WatchlistTransition = {
  animeId?: number;
  action?: "add" | "status" | "remove";
  status?: string;
  title?: string;
};

export function DetailWatchlistChoreography() {
  useEffect(() => {
    const onTransition = (event: Event) => {
      const detail = (event as CustomEvent<WatchlistTransition>).detail;
      const origin = document.querySelector<HTMLElement>("[data-watchlist-origin]");
      const destination = document.querySelector<HTMLElement>("[data-watchlist-destination]");
      if (!origin || !destination) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const originRect = origin.getBoundingClientRect();
      const destinationRect = destination.getBoundingClientRect();
      const startX = originRect.left + originRect.width / 2;
      const startY = originRect.top + originRect.height / 2;
      const endX = destinationRect.left + destinationRect.width / 2;
      const endY = destinationRect.top + destinationRect.height / 2;

      document.documentElement.style.setProperty("--watchlist-travel-x", `${endX - startX}px`);
      document.documentElement.style.setProperty("--watchlist-travel-y", `${endY - startY}px`);

      const page = document.querySelector<HTMLElement>(".detail-artwork-aware");
      page?.classList.remove("is-watchlist-transitioning");
      if (page) {
        void page.offsetWidth;
        page.classList.add("is-watchlist-transitioning");
        window.setTimeout(() => page.classList.remove("is-watchlist-transitioning"), 1050);
      }

      if (reduceMotion) {
        destination.classList.add("is-watchlist-landed");
        window.setTimeout(() => destination.classList.remove("is-watchlist-landed"), 520);
        return;
      }

      const beacon = document.createElement("span");
      beacon.className = "watchlist-travel-beacon";
      beacon.setAttribute("aria-hidden", "true");
      beacon.style.left = `${startX}px`;
      beacon.style.top = `${startY}px`;
      beacon.dataset.action = detail?.action ?? "status";
      document.body.appendChild(beacon);

      window.setTimeout(() => {
        destination.classList.add("is-watchlist-landed");
        beacon.remove();
        window.setTimeout(() => destination.classList.remove("is-watchlist-landed"), 560);
      }, 720);
    };

    window.addEventListener("animenexus:watchlist-transition", onTransition);
    return () => window.removeEventListener("animenexus:watchlist-transition", onTransition);
  }, []);

  return null;
}
