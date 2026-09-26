"use client";

import { useEffect } from "react";

export function HomeInteractionLayer() {
  useEffect(() => {
    const home = document.querySelector<HTMLElement>(".nexus-home");
    if (!home) return;

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups: Array<() => void> = [];

    home.classList.add("home-interactions-ready");

    const scenes = Array.from(home.querySelectorAll<HTMLElement>(".nexus-intent-band, .nexus-primary-band, .nexus-worlds-section, .nexus-index, .nexus-index-cut, .nexus-rails, .nexus-catalog"));
    const sceneObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-scene-active", entry.isIntersecting));
    }, { threshold: 0.18, rootMargin: "-12% 0px -12% 0px" });
    scenes.forEach((scene) => sceneObserver.observe(scene));
    cleanups.push(() => sceneObserver.disconnect());

    const archive = home.querySelector<HTMLElement>(".nexus-archive-wall");
    if (archive) {
      const items = Array.from(archive.querySelectorAll<HTMLElement>(".nexus-archive-item"));
      items.forEach((item, index) => item.style.setProperty("--archive-index", String(index)));
      const archiveObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { entry.target.classList.add("is-visible"); archiveObserver.unobserve(entry.target); }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
      items.forEach((item) => archiveObserver.observe(item));
      cleanups.push(() => archiveObserver.disconnect());
    }

    const hoverGroups = [".nexus-feature-field", ".nexus-archive-wall", ".home-rail"];
    hoverGroups.forEach((selector) => {
      home.querySelectorAll<HTMLElement>(selector).forEach((group) => {
        const cardSelector = selector === ".home-rail" ? ".home-rail-card" : selector === ".nexus-feature-field" ? ".nexus-index-card" : ".nexus-archive-item";
        const cards = Array.from(group.querySelectorAll<HTMLElement>(cardSelector));
        const enter = (event: Event) => {
          if (!finePointer || reduceQuery.matches) return;
          const target = event.target instanceof Element ? event.target.closest<HTMLElement>(cardSelector) : null;
          if (!target) return;
          group.classList.add("has-focus-card");
          cards.forEach((card) => card.classList.toggle("is-focus-card", card === target));
        };
        const leave = () => {
          group.classList.remove("has-focus-card");
          cards.forEach((card) => card.classList.remove("is-focus-card"));
        };
        group.addEventListener("pointerover", enter);
        group.addEventListener("pointerleave", leave);
        cleanups.push(() => { group.removeEventListener("pointerover", enter); group.removeEventListener("pointerleave", leave); });
      });
    });

    home.querySelectorAll<HTMLElement>(".home-rail").forEach((rail) => {
      if (!finePointer) return;
      let dragging = false; let startX = 0; let startScroll = 0;
      const down = (event: PointerEvent) => {
        if (event.button !== 0) return;
        dragging = true; startX = event.clientX; startScroll = rail.scrollLeft;
        rail.classList.add("is-dragging"); rail.setPointerCapture?.(event.pointerId);
      };
      const move = (event: PointerEvent) => { if (dragging) rail.scrollLeft = startScroll - (event.clientX - startX) * 1.08; };
      const end = () => { dragging = false; rail.classList.remove("is-dragging"); };
      rail.addEventListener("pointerdown", down); rail.addEventListener("pointermove", move); rail.addEventListener("pointerup", end); rail.addEventListener("pointercancel", end); rail.addEventListener("lostpointercapture", end);
      cleanups.push(() => { rail.removeEventListener("pointerdown", down); rail.removeEventListener("pointermove", move); rail.removeEventListener("pointerup", end); rail.removeEventListener("pointercancel", end); rail.removeEventListener("lostpointercapture", end); });
    });

    let raf = 0;
    const updateSceneFocus = () => {
      raf = 0; if (reduceQuery.matches) return;
      const viewport = window.innerHeight;
      scenes.forEach((scene) => {
        const rect = scene.getBoundingClientRect();
        const centre = rect.top + rect.height / 2;
        const distance = Math.abs(centre - viewport / 2) / Math.max(viewport, rect.height);
        scene.style.setProperty("--scene-focus", Math.max(0, Math.min(1, 1 - distance)).toFixed(3));
      });
      const cut = home.querySelector<HTMLElement>(".nexus-index-cut");
      if (cut) {
        const rect = cut.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (window.innerWidth / 2 - rect.left) / Math.max(rect.width, 1)));
        const y = Math.max(0, Math.min(1, (window.innerHeight / 2 - rect.top) / Math.max(rect.height, 1)));
        cut.style.setProperty("--cut-x", String(x * 100) + "%");
        cut.style.setProperty("--cut-y", String(y * 100) + "%");
      }
    };
    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(updateSceneFocus); };
    window.addEventListener("scroll", onScroll, { passive: true }); updateSceneFocus();
    cleanups.push(() => { window.removeEventListener("scroll", onScroll); if (raf) window.cancelAnimationFrame(raf); });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
  return null;
}
