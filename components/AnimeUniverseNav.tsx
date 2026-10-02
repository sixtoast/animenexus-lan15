"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { claimNexusCommand, onNexusSignal } from "@/lib/nexus-intelligence";

export const UNIVERSE_SPACES = ["story","identity","characters","creators","artwork","soundtrack","franchise","watch","personal"] as const;
type UniverseSpace = (typeof UNIVERSE_SPACES)[number];

const labels: Record<string,string> = {
  story:"Story", identity:"Identity", characters:"Characters", creators:"Creators",
  artwork:"Artwork", soundtrack:"Soundtrack", franchise:"Franchise", watch:"Watch", personal:"Yours",
};

const NAV_OFFSET = 92;

export function AnimeUniverseNav() {
  const [active, setActive] = useState<UniverseSpace>(UNIVERSE_SPACES[0]);
  const [progress, setProgress] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const programmaticScrollUntil = useRef(0);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const els = UNIVERSE_SPACES.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    let ticking = false;
    const updateProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    };

    const observer = new IntersectionObserver((entries) => {
      // A programmatic jump owns the active state until the smooth scroll settles.
      // Without this guard, the outgoing Story section can win an intersection
      // callback during the jump to Identity/Characters and fight the navigation.
      if (performance.now() < programmaticScrollUntil.current) return;

      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      setActive(visible.target.id as UniverseSpace);
      const track = trackRef.current;
      const button = track?.querySelector<HTMLButtonElement>(
        `button[data-space="${visible.target.id}"]`,
      );
      if (track && button) {
        // IMPORTANT: never call Element.scrollIntoView() from the section
        // observer. Even with block:"nearest", browsers may scroll the page
        // ancestor as well as the horizontal nav. On the anime detail view
        // that can yank the document back towards #story when the hero/modal
        // changes size or receives interaction. Scroll only the nav's own
        // horizontal scroller.
        const targetLeft =
          button.offsetLeft - Math.max(0, (track.clientWidth - button.offsetWidth) / 2);
        track.scrollTo({ left: targetLeft, behavior: "smooth" });
      }
    }, { rootMargin: "-22% 0px -55% 0px", threshold: [0.05, 0.18, 0.45, 0.75] });

    els.forEach((el) => observer.observe(el));
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateProgress);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  const jump = useCallback((id: UniverseSpace) => {
    const target = document.getElementById(id);
    if (!target) return;

    setActive(id);

    // Use an explicit document position rather than scrollIntoView(). This
    // keeps the sticky Universe nav from participating in the document scroll
    // and makes the section destination deterministic.
    const top = Math.max(
      0,
      window.scrollY + target.getBoundingClientRect().top - NAV_OFFSET,
    );

    programmaticScrollUntil.current = performance.now() + 900;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      programmaticScrollUntil.current = 0;
    }, 1000);

    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  useEffect(() => {
    return onNexusSignal((signal) => {
      if (signal.source !== "ai" || !claimNexusCommand(signal.id, "universe-nav") || signal.type !== "focus") {
        return;
      }
      const target: UniverseSpace | null =
        signal.target === "artwork"
          ? "artwork"
          : signal.target === "franchise"
            ? "franchise"
            : signal.target === "watch-order"
              ? "watch"
              : null;
      if (target) jump(target);
    });
  }, [jump]);

  return (
    <nav className="anime-universe-nav" aria-label="Anime universe">
      <div className="anime-universe-nav__progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div className="anime-universe-nav__inner">
        <div className="anime-universe-nav__chapter" aria-hidden="true">
          <span className="anime-universe-nav__chapter-index">
            {String(UNIVERSE_SPACES.indexOf(active) + 1).padStart(2, "0")}
          </span>
          <span className="anime-universe-nav__chapter-rule" />
          <span className="anime-universe-nav__chapter-label">UNIVERSE</span>
        </div>
        <div className="anime-universe-nav__track" ref={trackRef}>
          {UNIVERSE_SPACES.map((id, i) => (
            <button
              key={id}
              type="button"
              data-space={id}
              className={active === id ? "is-active" : ""}
              aria-current={active === id ? "location" : undefined}
              onClick={() => jump(id)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{labels[id]}</b>
            </button>
          ))}
        </div>
        <span className="anime-universe-nav__state" aria-live="polite">
          {String(UNIVERSE_SPACES.indexOf(active) + 1).padStart(2, "0")} / {String(UNIVERSE_SPACES.length).padStart(2, "0")}
        </span>
      </div>
    </nav>
  );
}
