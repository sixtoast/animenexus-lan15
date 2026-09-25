"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = [
  ".hero > *",
  ".section-head",
  ".home-rail-section",
  ".home-primary",
  ".tonight-desk",
  ".cold-start-path",
  ".exp-pack-strip",
  ".anime-card",
  ".filter-panel",
  ".state-box",
  ".site-footer-inner",
].join(",");

export function AwwwardsMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduced =
      root.dataset.reduceMotion === "true" &&
      root.dataset.motion !== "full";

    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );

    revealTargets.forEach((el, index) => {
      el.dataset.motionReveal = "ready";
      el.style.setProperty("--motion-index", String(index % 8));
    });

    if (reduced) {
      revealTargets.forEach((el) => {
        el.dataset.motionReveal = "shown";
      });
    } else if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).dataset.motionReveal = "shown";
              observer.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );

      revealTargets.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    } else {
      revealTargets.forEach((el) => {
        el.dataset.motionReveal = "shown";
      });
    }
  }, [pathname]);

  useEffect(() => {
    if (!window.matchMedia("(pointer:fine)").matches) return;

    let frame = 0;
    let x = window.innerWidth * 0.5;
    let y = window.innerHeight * 0.35;
    let nextX = x;
    let nextY = y;

    const tick = () => {
      frame = 0;
      x += (nextX - x) * 0.16;
      y += (nextY - y) * 0.16;
      document.documentElement.style.setProperty("--nx-mx", `${x}px`);
      document.documentElement.style.setProperty("--nx-my", `${y}px`);
    };

    const onPointerMove = (event: PointerEvent) => {
      nextX = event.clientX;
      nextY = event.clientY;

      const target = (event.target as HTMLElement | null)?.closest(
        ".anime-card",
      ) as HTMLElement | null;

      if (target) {
        const rect = target.getBoundingClientRect();
        const px = (event.clientX - rect.left) / Math.max(rect.width, 1);
        const py = (event.clientY - rect.top) / Math.max(rect.height, 1);
        const nx = px * 2 - 1;
        const ny = py * 2 - 1;
        target.style.setProperty("--ptr-x", `${px * 100}%`);
        target.style.setProperty("--ptr-y", `${py * 100}%`);
        target.style.setProperty("--ptr-nx", nx.toFixed(3));
        target.style.setProperty("--ptr-ny", ny.toFixed(3));
        target.style.setProperty("--tilt-x", `${(-ny * 2.2).toFixed(2)}deg`);
        target.style.setProperty("--tilt-y", `${(nx * 2.8).toFixed(2)}deg`);
      }

      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    const onPointerLeave = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        ".anime-card",
      ) as HTMLElement | null;
      if (!target) return;
      target.style.setProperty("--ptr-nx", "0");
      target.style.setProperty("--ptr-ny", "0");
      target.style.setProperty("--tilt-x", "0deg");
      target.style.setProperty("--tilt-y", "0deg");
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
