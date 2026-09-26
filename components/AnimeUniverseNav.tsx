"use client";

import { useEffect, useRef, useState } from "react";
import { claimNexusCommand, onNexusSignal } from "@/lib/nexus-intelligence";

export const UNIVERSE_SPACES = ["story","identity","characters","creators","artwork","soundtrack","franchise","watch","personal"] as const;

const labels: Record<string,string> = {
  story:"Story", identity:"Identity", characters:"Characters", creators:"Creators",
  artwork:"Artwork", soundtrack:"Soundtrack", franchise:"Franchise", watch:"Watch", personal:"Yours",
};

export function AnimeUniverseNav() {
  const [active, setActive] = useState<string>(UNIVERSE_SPACES[0]);
  const [progress, setProgress] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

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
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      setActive(visible.target.id);
      const button = trackRef.current?.querySelector<HTMLButtonElement>(
        `button[data-space="${visible.target.id}"]`,
      );
      button?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, { rootMargin: "-22% 0px -55% 0px", threshold: [0.05, 0.18, 0.45, 0.75] });

    els.forEach((el) => observer.observe(el));
    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const jump = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    setActive(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    return onNexusSignal((signal) => {
      if (signal.source !== "ai" || !claimNexusCommand(signal.id, "universe-nav") || signal.type !== "focus") {
        return;
      }
      const target =
        signal.target === "artwork"
          ? "artwork"
          : signal.target === "franchise"
            ? "franchise"
            : signal.target === "watch-order"
              ? "watch"
              : null;
      if (target) jump(target);
    });
  }, []);

  return (
    <nav className="anime-universe-nav" aria-label="Anime universe">
      <div className="anime-universe-nav__progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div className="anime-universe-nav__orbit" aria-hidden="true">
        <span className="anime-universe-nav__orbit-dot" />
      </div>
      <div className="anime-universe-nav__inner">
        <span className="anime-universe-nav__brand">UNIVERSE</span>
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
              {labels[id]}
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
