"use client";

import { useEffect } from "react";

const SPACES = ["story","identity","watch","creators","artwork","external-links","episodes","franchise","ancestry","personal","soundtrack"];

export function UniverseScrollChoreography() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".cinema-detail-page");
    if (!page) return;

    const sections = SPACES
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-universe-visible", entry.isIntersecting);
      });
    }, { rootMargin: "-18% 0px -28% 0px", threshold: 0.01 });

    sections.forEach((section) => observer.observe(section));

    let raf = 0;
    const update = () => {
      raf = 0;
      const viewport = window.innerHeight || 1;
      const centre = viewport * 0.5;
      let nearest = sections[0];
      let nearestDistance = Infinity;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height * 0.5 - centre);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = section;
        }

        const reveal = Math.max(0, Math.min(1, 1 - Math.abs(rect.top + rect.height * 0.5 - centre) / (viewport * 0.72)));
        section.style.setProperty("--universe-reveal", reveal.toFixed(3));
        section.style.setProperty("--universe-index", String(index));
      });

      page.dataset.activeSpace = nearest.id;
      const hero = page.querySelector<HTMLElement>(".detail-hero");
      if (hero) {
        const heroRect = hero.getBoundingClientRect();
        const heroProgress = Math.max(0, Math.min(1, -heroRect.top / Math.max(1, heroRect.height)));
        page.style.setProperty("--hero-scroll", heroProgress.toFixed(3));
      }
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
