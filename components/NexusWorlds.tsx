"use client";

import Link from "next/link";
import { useState } from "react";
import type { Anime } from "@/lib/types";

type Props = { candidates: Anime[] };

const positions = [
  { x: "9%", y: "19%" },
  { x: "78%", y: "14%" },
  { x: "2%", y: "51%" },
  { x: "82%", y: "50%" },
  { x: "17%", y: "76%" },
  { x: "69%", y: "78%" },
  { x: "50%", y: "4%" },
];

function connectionPoints(index: number) {
  const points = [
    ["50", "50", "18", "27"], ["50", "50", "82", "22"], ["50", "50", "13", "59"],
    ["50", "50", "87", "58"], ["50", "50", "24", "82"], ["50", "50", "75", "82"],
    ["50", "50", "50", "10"],
  ];
  return points[index] ?? points[0];
}

export function NexusWorlds({ candidates }: Props) {
  const worlds = candidates.slice(7, 14);
  const [active, setActive] = useState<number | null>(null);
  if (!worlds.length) return null;
  const activeAnime = active === null ? null : worlds[active];

  return (
    <div
      className="nexus-world-map"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--world-x", `${((event.clientX - rect.left) / rect.width - 0.5) * 7}px`);
        event.currentTarget.style.setProperty("--world-y", `${((event.clientY - rect.top) / rect.height - 0.5) * 7}px`);
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.setProperty("--world-x", "0px");
        event.currentTarget.style.setProperty("--world-y", "0px");
        setActive(null);
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
        <span>DISCOVERY FIELD · 07</span>
        <strong>Worlds<br /><em>nearby.</em></strong>
        <small>{activeAnime ? "Signal locked. Follow the thread." : "Adjacent titles detected around your current taste vector."}</small>
        <div className="nexus-world-core-status"><i /> {activeAnime ? "TRACKING" : "SCANNING"}</div>
      </div>
      <div className="nexus-world-field-note nexus-world-field-note--tl">TASTE VECTOR / LOCAL</div>
      <div className="nexus-world-field-note nexus-world-field-note--br">SELECT A SIGNAL</div>
      {worlds.map((anime, index) => {
        const position = positions[index];
        const isActive = active === index;
        return (
          <Link
            key={anime.id}
            href={`/anime/${anime.id}`}
            className={`nexus-world-node nexus-world-node--${index + 1}${isActive ? " is-active" : ""}`}
            style={{ "--node-x": position.x, "--node-y": position.y } as React.CSSProperties}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            aria-label={`Explore ${anime.title}`}
          >
            <span className="nexus-world-node-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anime.image} alt="" loading="lazy" />
              <b>{String(index + 1).padStart(2, "0")}</b>
            </span>
            <span className="nexus-world-node-copy">
              <small>{anime.genre || "ADJACENT WORLD"}</small>
              <strong>{anime.title}</strong>
              <i>{anime.year || "—"} · ★ {anime.score > 0 ? anime.score.toFixed(1) : "—"}</i>
            </span>
          </Link>
        );
      })}
    </div>
  );
}