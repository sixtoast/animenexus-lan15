"use client";

import { useEffect } from "react";

export function CinemaMotion() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("cinema-motion-ready");

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".nexus-opening-copy, .nexus-opening-subject, .nexus-band-label, .nexus-intent-layout, .nexus-primary-band > *, .nexus-worlds-heading, .nexus-world-map, .nexus-section-heading, .nexus-feature-field, .nexus-index-cut, .nexus-rails, .nexus-catalog-foot, .nexus-quote"
      )
    );

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealTargets.forEach((element) => {
      element.classList.add("cinema-reveal");
      revealObserver.observe(element);
    });

    const opening = document.querySelector<HTMLElement>(".nexus-opening");
    const openingBg = document.querySelector<HTMLElement>(".nexus-opening-bg");
    const openingSubject = document.querySelector<HTMLElement>(".nexus-opening-subject-image");
    const indexCut = document.querySelector<HTMLElement>(".nexus-index-cut");

    let raf = 0;
    let pointerX = 0;
    let pointerY = 0;
    let scrollY = window.scrollY;

    const updateMotion = () => {
      raf = 0;
      scrollY = window.scrollY;

      if (!reduced) {
        if (opening && openingBg) {
          const progress = Math.min(scrollY / Math.max(opening.offsetHeight, 1), 1);
          openingBg.style.setProperty("--cinema-scroll-y", `${progress * 70}px`);
          openingBg.style.setProperty("--cinema-scroll-scale", `${1.04 + progress * 0.055}`);
          opening.style.setProperty("--cinema-opening-progress", String(progress));
        }

        if (openingSubject) {
          const rect = openingSubject.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            const centre = rect.top + rect.height / 2;
            const drift = (centre - window.innerHeight / 2) / window.innerHeight;
            openingSubject.style.setProperty("--cinema-subject-y", `${drift * -12}px`);
          }
        }

        if (indexCut) {
          const rect = indexCut.getBoundingClientRect();
          const visible = Math.min(1, Math.max(0, 1 - Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2) / (window.innerHeight + rect.height)));
          indexCut.style.setProperty("--cinema-cut-focus", String(visible));
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(updateMotion);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateMotion();

    let cursor: HTMLDivElement | null = null;
    let cursorRaf = 0;

    const magnetic = finePointer && !reduced
      ? Array.from(document.querySelectorAll<HTMLElement>(".nexus-button, .nexus-index-cut-link, .nexus-section-heading > a"))
      : [];

    const cleanups: Array<() => void> = [];

    if (finePointer && !reduced) {
      cursor = document.createElement("div");
      cursor.className = "cinema-cursor";
      cursor.setAttribute("aria-hidden", "true");
      document.body.appendChild(cursor);

      const moveCursor = (event: PointerEvent) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (!cursorRaf) {
          cursorRaf = window.requestAnimationFrame(() => {
            cursorRaf = 0;
            if (!cursor) return;
            cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
          });
        }

        const target = (event.target as Element | null)?.closest<HTMLElement>(
          ".nexus-index-card, .nexus-archive-item, .nexus-world-node, .nexus-opening-subject"
        );
        document.body.classList.toggle("cinema-cursor-focus", Boolean(target));
      };

      window.addEventListener("pointermove", moveCursor, { passive: true });
      cleanups.push(() => window.removeEventListener("pointermove", moveCursor));

      magnetic.forEach((element) => {
        const onMove = (event: PointerEvent) => {
          const rect = element.getBoundingClientRect();
          const x = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
          const y = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
          element.style.setProperty("--mag-x", `${x * 12}px`);
          element.style.setProperty("--mag-y", `${y * 9}px`);
        };
        const reset = () => {
          element.style.setProperty("--mag-x", "0px");
          element.style.setProperty("--mag-y", "0px");
        };
        element.addEventListener("pointermove", onMove);
        element.addEventListener("pointerleave", reset);
        cleanups.push(() => {
          element.removeEventListener("pointermove", onMove);
          element.removeEventListener("pointerleave", reset);
        });
      });

      const tiltTargets = Array.from(
        document.querySelectorAll<HTMLElement>(".nexus-index-card, .nexus-archive-item")
      );

      tiltTargets.forEach((element) => {
        const onMove = (event: PointerEvent) => {
          const rect = element.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          element.style.setProperty("--tilt-x", `${y * -2.8}deg`);
          element.style.setProperty("--tilt-y", `${x * 3.5}deg`);
        };
        const reset = () => {
          element.style.setProperty("--tilt-x", "0deg");
          element.style.setProperty("--tilt-y", "0deg");
        };
        element.addEventListener("pointermove", onMove);
        element.addEventListener("pointerleave", reset);
        cleanups.push(() => {
          element.removeEventListener("pointermove", onMove);
          element.removeEventListener("pointerleave", reset);
        });
      });
    }

    const resize = () => updateMotion();
    window.addEventListener("resize", resize);

    return () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      if (raf) window.cancelAnimationFrame(raf);
      if (cursorRaf) window.cancelAnimationFrame(cursorRaf);
      cleanups.forEach((cleanup) => cleanup());
      cursor?.remove();
      document.body.classList.remove("cinema-cursor-focus");
      root.classList.remove("cinema-motion-ready");
    };
  }, []);

  return null;
}
