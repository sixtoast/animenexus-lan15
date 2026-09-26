"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function CinemaMotion() {
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    root.classList.add("cinema-motion-ready");

    const reduced = () => reducedQuery.matches;

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
      { threshold: 0.08, rootMargin: "0px 0px -10% 0px" }
    );

    revealTargets.forEach((element) => {
      element.classList.add("cinema-reveal");
      revealObserver.observe(element);
    });

    const splitHeadings = Array.from(
      document.querySelectorAll<HTMLElement>(".nexus-section-heading h2, .nexus-worlds-heading h2")
    );

    splitHeadings.forEach((heading) => {
      if (heading.dataset.motionSplit === "true") return;
      const text = heading.textContent?.trim();
      if (!text) return;
      heading.dataset.motionSplit = "true";
      heading.innerHTML = text
        .split(/\s+/)
        .map((word, index) => `<span class="cinema-word" style="--word-index:${index}"><span>${word}</span></span>`)
        .join(" ");
    });

    const opening = document.querySelector<HTMLElement>(".nexus-opening");
    const openingBg = document.querySelector<HTMLElement>(".nexus-opening-bg");
    const openingSubject = document.querySelector<HTMLElement>(".nexus-opening-subject-image");
    const indexCut = document.querySelector<HTMLElement>(".nexus-index-cut");
    const scenes = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".nexus-opening, .nexus-intent-band, .nexus-primary-band, .nexus-worlds-section, .nexus-index, .nexus-rails, .nexus-catalog"
      )
    );

    let raf = 0;
    let cursorRaf = 0;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let lastScroll = window.scrollY;
    let scrollVelocity = 0;

    const updateMotion = () => {
      raf = 0;
      const y = window.scrollY;
      scrollVelocity += (y - lastScroll - scrollVelocity) * 0.16;
      lastScroll = y;

      if (!reduced()) {
        if (opening && openingBg) {
          const progress = Math.min(y / Math.max(opening.offsetHeight, 1), 1);
          openingBg.style.setProperty("--cinema-scroll-y", `${progress * 90}px`);
          openingBg.style.setProperty("--cinema-scroll-scale", `${1.045 + progress * 0.075}`);
          opening.style.setProperty("--cinema-opening-progress", String(progress));
          opening.style.setProperty("--cinema-scroll-velocity", String(Math.max(-18, Math.min(18, scrollVelocity))));
        }

        if (openingSubject) {
          const rect = openingSubject.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            const centre = rect.top + rect.height / 2;
            const drift = (centre - window.innerHeight / 2) / window.innerHeight;
            openingSubject.style.setProperty("--cinema-subject-y", `${drift * -15}px`);
          }
        }

        scenes.forEach((scene) => {
          const rect = scene.getBoundingClientRect();
          const centre = rect.top + rect.height / 2;
          const distance = (centre - window.innerHeight / 2) / Math.max(window.innerHeight, rect.height);
          const progress = Math.max(-1, Math.min(1, distance));
          scene.style.setProperty("--scene-progress", progress.toFixed(3));
          scene.style.setProperty("--scene-energy", Math.min(1, Math.abs(progress)).toFixed(3));
        });

        if (indexCut) {
          const rect = indexCut.getBoundingClientRect();
          const focus = Math.min(
            1,
            Math.max(
              0,
              1 - Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2) /
                (window.innerHeight + rect.height)
            )
          );
          indexCut.style.setProperty("--cinema-cut-focus", String(focus));
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(updateMotion);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateMotion();

    const cleanups: Array<() => void> = [];

    if (finePointer && !reduced()) {
      const movePointer = (event: PointerEvent) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        root.style.setProperty("--cursor-x", `${pointerX}px`);
        root.style.setProperty("--cursor-y", `${pointerY}px`);

        if (!cursorRaf) {
          cursorRaf = window.requestAnimationFrame(() => {
            cursorRaf = 0;
            const target = (event.target as Element | null)?.closest<HTMLElement>(
              ".nexus-index-card, .nexus-archive-item, .nexus-world-node, .nexus-opening-subject, .nexus-button, .nexus-index-cut-link"
            );
            body.classList.toggle("cinema-cursor-focus", Boolean(target));
          });
        }
      };

      window.addEventListener("pointermove", movePointer, { passive: true });
      cleanups.push(() => window.removeEventListener("pointermove", movePointer));

      const magnetic = Array.from(
        document.querySelectorAll<HTMLElement>(".nexus-button, .nexus-index-cut-link, .nexus-section-heading > a")
      );

      magnetic.forEach((element) => {
        const onMove = (event: PointerEvent) => {
          const rect = element.getBoundingClientRect();
          const x = (event.clientX - (rect.left + rect.width / 2)) / Math.max(rect.width, 1);
          const y = (event.clientY - (rect.top + rect.height / 2)) / Math.max(rect.height, 1);
          element.style.setProperty("--mag-x", `${x * 13}px`);
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
          const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
          const y = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
          element.style.setProperty("--tilt-x", `${y * -3.2}deg`);
          element.style.setProperty("--tilt-y", `${x * 4.2}deg`);
          element.style.setProperty("--glare-x", `${(x + 0.5) * 100}%`);
          element.style.setProperty("--glare-y", `${(y + 0.5) * 100}%`);
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

      const internalLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]'));
      const curtain = document.createElement("div");
      curtain.className = "cinema-route-curtain";
      curtain.setAttribute("aria-hidden", "true");
      curtain.innerHTML = '<span class="cinema-route-curtain-mark">ANIMENEXUS</span><i></i>';
      body.appendChild(curtain);

      let navigating = false;
    const navigate = (href: string) => {
        if (navigating) return;
        navigating = true;
        curtain.classList.add("is-leaving");
        window.setTimeout(() => {
          router.push(href);
        }, 420);
      };

      internalLinks.forEach((link) => {
        const onClick = (event: MouseEvent) => {
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            link.target === "_blank"
          ) return;

          const url = new URL(link.href, window.location.href);
          if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.hash) return;

          event.preventDefault();
          navigate(url.pathname + url.search + url.hash);
        };
        link.addEventListener("click", onClick);
        cleanups.push(() => link.removeEventListener("click", onClick));
      });

      const hideCurtain = window.setTimeout(() => curtain.classList.add("is-ready"), 40);
      cleanups.push(() => {
        window.clearTimeout(hideCurtain);
        curtain.remove();
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
      root.classList.remove("cinema-motion-ready");
      root.style.removeProperty("--cursor-x");
      root.style.removeProperty("--cursor-y");
      body.classList.remove("cinema-cursor-focus");
    };
  }, [router]);

  return null;
}
