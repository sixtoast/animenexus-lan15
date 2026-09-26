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
          </Link>
        );
      })}
    </div>
  );
}
