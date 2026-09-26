"use client";

import { useEffect } from "react";

export function BrowseFieldMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cinema-browse-page");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let tx = innerWidth / 2;
    let ty = innerHeight / 2;
    let x = tx;
    let y = ty;
    let last = scrollY;
    let velocity = 0;

    const cards = Array.from(root.querySelectorAll<HTMLElement>(".anime-card"));
    const cleanups = cards.map((card, index) => {
      card.style.setProperty("--browse-index", String(index));
      const move = (e: PointerEvent) => {
        const r = card.getBoundingClientRect();
        const px = ((e.clientX - r.left) / Math.max(r.width, 1) - .5) * 2;
        const py = ((e.clientY - r.top) / Math.max(r.height, 1) - .5) * 2;
        card.style.setProperty("--browse-tilt-x", (-py * 2.8).toFixed(2) + "deg");
        card.style.setProperty("--browse-tilt-y", (px * 3.8).toFixed(2) + "deg");
        card.style.setProperty("--browse-glow-x", (px * 50 + 50).toFixed(1) + "%");
        card.style.setProperty("--browse-glow-y", (py * 50 + 50).toFixed(1) + "%");
      };
      const leave = () => {
        card.style.setProperty("--browse-tilt-x", "0deg");
        card.style.setProperty("--browse-tilt-y", "0deg");
        card.style.setProperty("--browse-glow-x", "50%");
        card.style.setProperty("--browse-glow-y", "50%");
      };
      card.addEventListener("pointermove", move, { passive: true });
      card.addEventListener("pointerleave", leave);
      return () => {
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", leave);
      };
    });

    const tick = () => {
      raf = 0;
      x += (tx - x) * .075;
      y += (ty - y) * .075;
      velocity += (scrollY - last - velocity) * .12;
      last = scrollY;
      root.style.setProperty("--browse-pointer-x", (x / innerWidth * 100) + "%");
      root.style.setProperty("--browse-pointer-y", (y / innerHeight * 100) + "%");
      root.style.setProperty("--browse-pointer-dx", ((x / innerWidth - .5) * 18) + "px");
      root.style.setProperty("--browse-pointer-dy", ((y / innerHeight - .5) * 12) + "px");
      root.style.setProperty("--browse-scroll-velocity", Math.max(-14, Math.min(14, velocity)).toFixed(2));
      if (Math.abs(tx - x) > .4 || Math.abs(ty - y) > .4 || Math.abs(velocity) > .04) raf = requestAnimationFrame(tick);
    };

    const pointer = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const scroll = () => { if (!raf) raf = requestAnimationFrame(tick); };

    addEventListener("pointermove", pointer, { passive: true });
    addEventListener("scroll", scroll, { passive: true });
    tick();

    return () => {
      removeEventListener("pointermove", pointer);
      removeEventListener("scroll", scroll);
      if (raf) cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
