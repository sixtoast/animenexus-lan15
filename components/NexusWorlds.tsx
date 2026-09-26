"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Anime } from "@/lib/types";

type Props = { candidates: Anime[] };

const positions = [
  { x: "9%", y: "19%" }, { x: "78%", y: "14%" }, { x: "2%", y: "51%" },
  { x: "82%", y: "50%" }, { x: "17%", y: "76%" }, { x: "69%", y: "78%" }, { x: "50%", y: "4%" },
];

function connectionPoints(index: number) {
  const points = [
    ["50","50","18","27"],["50","50","82","22"],["50","50","13","59"],["50","50","87","58"],
    ["50","50","24","82"],["50","50","75","82"],["50","50","50","10"],
  ];
  return points[index] ?? points[0];
}

function sharedDNA(current: Anime, other: Anime) {
  const currentTags = new Set([current.genre, ...current.tags].filter(Boolean).map((tag) => tag.toLowerCase()));
  const shared = [other.genre, ...other.tags]
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .filter((tag) => currentTags.has(tag.toLowerCase()))
    .slice(0, 2);
  return shared.length ? shared.join(" · ") : other.genre || "ADJACENT WORLD";
}

export function NexusWorlds({ candidates }: Props) {
  const worlds = candidates.slice(7, 14);
  const [active, setActive] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [secret, setSecret] = useState(false);
  const [entered, setEntered] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setEntered(true);
        observer.disconnect();
      }
    }, { threshold: 0.18 });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!entered) return;
    const field = fieldRef.current;
    if (!field) return;

    const nodes = Array.from(field.querySelectorAll<HTMLElement>(".nexus-world-node"));
    if (!nodes.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fieldRect = field.getBoundingClientRect();
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const spacing = mobile ? 52 : 108;
    const lineupY = fieldRect.height * (mobile ? 0.44 : 0.48);
    const centreX = fieldRect.left + fieldRect.width / 2;
    const centreY = fieldRect.top + fieldRect.height / 2;
    const timers: number[] = [];
    const animations: Animation[] = [];

    // One shared orbital system. Every card gets the same ellipse and angular
    // velocity, with only its phase offset changing. This keeps the formation
    // visually unified instead of giving each card its own orbit.
    const radiusX = Math.min(fieldRect.width * (mobile ? 0.34 : 0.34), mobile ? 150 : 430);
    const radiusY = Math.min(fieldRect.height * (mobile ? 0.28 : 0.30), mobile ? 165 : 245);
    const orbitDuration = mobile ? 30000 : 36000;

    nodes.forEach((node, index) => {
      const rect = node.getBoundingClientRect();
      const nodeCX = rect.left + rect.width / 2;
      const nodeCY = rect.top + rect.height / 2;
      const lineupCX = centreX + (index - (nodes.length - 1) / 2) * spacing;

      node.style.setProperty("--line-dx", lineupCX - nodeCX + "px");
      node.style.setProperty("--line-dy", fieldRect.top + lineupY - nodeCY + "px");
      node.style.setProperty("--spin-turns", index % 2 === 0 ? "1.75" : "-1.75");
      node.style.setProperty("--entry-delay", index * (mobile ? 75 : 95) + "ms");

      const orbit = node.querySelector<HTMLElement>(".nexus-world-node-orbit-motion");
      if (!orbit) return;

      orbit.getAnimations().forEach((animation) => animation.cancel());
      orbit.style.transform = "translate3d(0,0,0)";

      if (reduceMotion) return;

      const phase = (index / nodes.length) * Math.PI * 2;
      const targetX = Math.cos(phase) * radiusX;
      const targetY = Math.sin(phase) * radiusY;
      const targetDepth = (Math.sin(phase) + 1) / 2;
      const targetScale = 0.92 + targetDepth * 0.14;

      // The card first travels from the completed lineup into its assigned
      // orbital slot. The card itself never disappears or gets replaced.
      const travelTimer = window.setTimeout(() => {
        const travel = orbit.animate(
          [
            { transform: "translate3d(0,0,0) scale(1) rotateZ(0deg)" },
            {
              transform:
                "translate3d(" +
                targetX.toFixed(2) +
                "px," +
                targetY.toFixed(2) +
                "px,0) scale(" +
                targetScale.toFixed(3) +
                ") rotateZ(" +
                (Math.cos(phase) * 2.2).toFixed(2) +
                "deg)",
            },
          ],
          {
            duration: 1250,
            easing: "cubic-bezier(.16,.78,.16,1)",
            fill: "forwards",
          },
        );

        animations.push(travel);

        travel.finished
          .then(() => {
            // All cards now use the exact same orbit duration. Their phase
            // offsets keep them evenly distributed around one shared field.
            const orbitFrames = Array.from({ length: 49 }, (_, frame) => {
              const progress = frame / 48;
              const angle = phase + progress * Math.PI * 2;
              const x = Math.cos(angle) * radiusX;
              const y = Math.sin(angle) * radiusY;
              const depth = (Math.sin(angle) + 1) / 2;
              const scale = 0.92 + depth * 0.14;
              const tilt = Math.cos(angle) * 2.2;
              return {
                offset: progress,
                transform:
                  "translate3d(" +
                  x.toFixed(2) +
                  "px," +
                  y.toFixed(2) +
                  "px,0) scale(" +
                  scale.toFixed(3) +
                  ") rotateZ(" +
                  tilt.toFixed(2) +
                  "deg)",
              };
            });

            const orbital = orbit.animate(orbitFrames, {
              duration: orbitDuration,
              iterations: Infinity,
              easing: "linear",
            });
            animations.push(orbital);
          })
          .catch(() => {});
      }, 2550 + index * (mobile ? 75 : 95));

      timers.push(travelTimer);
    });

    return () => {
      timers.forEach(window.clearTimeout);
      animations.forEach((animation) => animation.cancel());
    };
  }, [entered, worlds.length]);
  if (!worlds.length) return null;

  const activeAnime = active === null ? null : worlds[active];
  const signalDNA = activeAnime ? [activeAnime.genre, ...activeAnime.tags].filter(Boolean).slice(0, 3).join(" · ") : "";
  const activeRelated = active === null
    ? []
    : worlds
        .map((anime, index) => ({ anime, index, dna: sharedDNA(activeAnime!, anime) }))
        .filter(({ index }) => index !== active)
        .slice(0, 3);

  return (
    <div
      ref={fieldRef}
      className={"nexus-world-map" + (entered ? " is-entered" : "") + (active !== null ? " has-active" : "") + (secret ? " has-secret" : "")}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--world-x", ((event.clientX - rect.left) / rect.width - 0.5) * 7 + "px");
        event.currentTarget.style.setProperty("--world-y", ((event.clientY - rect.top) / rect.height - 0.5) * 7 + "px");
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.setProperty("--world-x", "0px");
        event.currentTarget.style.setProperty("--world-y", "0px");
        setActive(null);
        setArmed(null);
      }}
    >
      <div className="nexus-world-grid" aria-hidden />
      <div className="nexus-world-scanline" aria-hidden />
      <div className="nexus-world-crosshair" aria-hidden />
      <svg className="nexus-world-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {worlds.map((anime, index) => {
          const [x1, y1, x2, y2] = connectionPoints(index);
          return <line key={anime.id} x1={x1} y1={y1} x2={x2} y2={y2} className={active === index ? "is-active" : ""} />;
        })}
      </svg>

      <div className="nexus-world-core">
        <div className="nexus-world-core-ring" aria-hidden />
        <span>DISCOVERY FIELD · {String(worlds.length).padStart(2, "0")}</span>
        <strong>{secret ? <>Stray<br /><em>signal.</em></> : <>Worlds<br /><em>nearby.</em></>}</strong>
        <small>
          {activeAnime
            ? "Signal locked. Follow the thread."
            : secret
              ? "An unindexed route appeared inside the field."
              : "Adjacent titles detected around your current taste vector."}
        </small>
        <div className="nexus-world-core-status"><i /> {activeAnime ? "TRACKING" : secret ? "UNMAPPED" : "SCANNING"}</div>
        {activeAnime ? <span className="nexus-world-core-active">{activeAnime.title}</span> : null}
      </div>

      {activeAnime ? (
        <div className="nexus-world-readout" aria-live="polite">
          <span>SIGNAL {String((active ?? 0) + 1).padStart(2, "0")} / LOCKED</span>
          <strong>{activeAnime.title}</strong>
          <small>SIGNAL DNA · {signalDNA || "ADJACENT WORLD"}</small>
          <div className="nexus-world-readout-links">
            {activeRelated.map(({ anime, index, dna }) => (
              <button key={anime.id} type="button" onClick={() => setActive(index)}>
                <b>{anime.title}</b><i>{dna}</i>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="nexus-world-field-note nexus-world-field-note--tl">TASTE VECTOR / LOCAL</div>
      <button
        type="button"
        className="nexus-world-field-note nexus-world-field-note--br nexus-world-secret-trigger"
        onClick={() => setSecret((value) => !value)}
        aria-label="Reveal hidden discovery signal"
      >
        {secret ? "RETURN TO FIELD" : "SELECT A SIGNAL · FIND THE STRAY"}
      </button>

      {worlds.map((anime, index) => {
        const position = positions[index];
        const isActive = active === index;
        const isArmed = armed === index;
        return (
          <Link
            key={anime.id}
            href={"/anime/" + anime.id}
            className={"nexus-world-node nexus-world-node--" + (index + 1) + (isActive ? " is-active" : "") + (isArmed ? " is-armed" : "")}
            style={{ "--node-x": position.x, "--node-y": position.y } as React.CSSProperties}
            onMouseEnter={() => { setActive(index); setArmed(index); }}
            onFocus={() => { setActive(index); setArmed(index); }}
            onBlur={() => { setArmed(null); }}
            onClick={(event) => {
              if (armed !== index) {
                event.preventDefault();
                setArmed(index);
                setActive(index);
              }
            }}
            aria-label={"Explore " + anime.title}
          >
            <span className="nexus-world-node-motion">
              <span className="nexus-world-node-orbit-motion">
              <span className="nexus-world-node-art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={anime.image} alt="" loading="lazy" />
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span className="nexus-world-node-lock">{isActive ? "LOCKED" : "SIGNAL"}</span>
              </span>
              <span className="nexus-world-node-copy">
                <small>{anime.genre || "ADJACENT WORLD"}</small>
                <strong>{anime.title}</strong>
                <i>{anime.year || "—"} · ★ {anime.score > 0 ? anime.score.toFixed(1) : "—"}</i>
              </span>
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
