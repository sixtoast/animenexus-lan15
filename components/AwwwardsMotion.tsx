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

const MAGNETIC_SELECTOR = [
  ".btn",
  ".nav-links a",
  ".feed-tab",
  ".mood-chip",
  ".filter-chip",
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

    const root = document.documentElement;
    let frame = 0;
    let pointerX = window.innerWidth * 0.5;
    let pointerY = window.innerHeight * 0.35;
    let targetX = pointerX;
    let targetY = pointerY;
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;

    const render = () => {
      frame = 0;
      pointerX += (targetX - pointerX) * 0.16;
      pointerY += (targetY - pointerY) * 0.16;

      const delta = window.scrollY - lastScrollY;
      scrollVelocity += (Math.max(-18, Math.min(18, delta)) - scrollVelocity) * 0.18;
      lastScrollY += (window.scrollY - lastScrollY) * 0.18;

      root.style.setProperty("--nx-mx", pointerX + "px");
      root.style.setProperty("--nx-my", pointerY + "px");
      root.style.setProperty("--nx-scroll-y", window.scrollY + "px");
      root.style.setProperty("--nx-scroll-velocity", scrollVelocity.toFixed(2));

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty(
        "--nx-scroll-progress",
        String(Math.min(1, Math.max(0, window.scrollY / maxScroll))),
      );
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;

      const target = (event.target as HTMLElement | null)?.closest(
        ".anime-card",
      ) as HTMLElement | null;

      if (target) {
        const rect = target.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1)));
        const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(rect.height, 1)));
        const nx = px * 2 - 1;
        const ny = py * 2 - 1;
        target.style.setProperty("--ptr-x", px * 100 + "%");
        target.style.setProperty("--ptr-y", py * 100 + "%");
        target.style.setProperty("--ptr-nx", nx.toFixed(3));
        target.style.setProperty("--ptr-ny", ny.toFixed(3));
        target.style.setProperty("--nx-card-x", px * 100 + "%");
        target.style.setProperty("--nx-card-y", py * 100 + "%");
        target.style.setProperty("--tilt-x", (-ny * 2.2).toFixed(2) + "deg");
        target.style.setProperty("--tilt-y", (nx * 2.8).toFixed(2) + "deg");
      }

      const magnetic = (event.target as HTMLElement | null)?.closest(
        MAGNETIC_SELECTOR,
      ) as HTMLElement | null;

      if (magnetic) {
        const rect = magnetic.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        const radius = Math.max(70, Math.min(130, Math.max(rect.width, rect.height) * 1.8));

        if (distance < radius) {
          const strength = (1 - distance / radius) * 7;
          magnetic.dataset.motionMagnetic = "true";
          magnetic.style.transform =
            "translate3d(" +
            (dx / radius * strength).toFixed(2) +
            "px," +
            (dy / radius * strength).toFixed(2) +
            "px,0)";
        } else {
          magnetic.dataset.motionMagnetic = "false";
          magnetic.style.transform = "";
        }
      }

      schedule();
    };

    const onPointerOut = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        ".anime-card",
      ) as HTMLElement | null;

      if (
        target &&
        event.relatedTarget instanceof Node &&
        target.contains(event.relatedTarget)
      ) {
        return;
      }

      if (target) {
        target.style.setProperty("--ptr-nx", "0");
        target.style.setProperty("--ptr-ny", "0");
        target.style.setProperty("--tilt-x", "0deg");
        target.style.setProperty("--tilt-y", "0deg");
      }

      const magnetic = (event.target as HTMLElement | null)?.closest(
        MAGNETIC_SELECTOR,
      ) as HTMLElement | null;

      if (
        magnetic &&
        !(event.relatedTarget instanceof Node && magnetic.contains(event.relatedTarget))
      ) {
        magnetic.style.transform = "";
        magnetic.dataset.motionMagnetic = "false";
      }
    };

    const onScroll = () => schedule();
    const onResize = () => schedule();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    schedule();

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
