"use client";

import Link from "next/link";
import { useState } from "react";
import type { Anime } from "@/lib/types";

type Props = { candidates: Anime[] };

export function NexusWorlds({ candidates }: Props) {
  const worlds = candidates.slice(7, 14);
  const [active, setActive] = useState<string | null>(null);
  if (!worlds.length) return null;

  return (
    <div
      className={`nexus-world-map${active ? " has-active" : ""}`}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--world-x", `${((event.clientX - rect.left) / rect.width - 0.5) * 10}px`);
        event.currentTarget.style.setProperty("--world-y", `${((event.clientY - rect.top) / rect.height - 0.5) * 10}px`);
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.setProperty("--world-x", "0px");
        event.currentTarget.style.setProperty("--world-y", "0px");
        setActive(null);
      }}
    >
      <div className="nexus-world-orbit nexus-world-orbit--one" aria-hidden />
      <div className="nexus-world-orbit nexus-world-orbit--two" aria-hidden />
      <div className="nexus-world-crosshair" aria-hidden />
      <div className="nexus-world-core">
        <span>DISCOVERY FIELD</span>
        <strong>Worlds<br /><em>nearby.</em></strong>
        <small>Adjacent titles from the current discovery pool.</small>
      </div>
      {worlds.map((anime, index) => (
        <Link
          key={anime.id}
          href={`/anime/${anime.id}`}
          className={`nexus-world-node nexus-world-node--${index + 1}${active === anime.id ? " is-active" : ""}`}
          onMouseEnter={() => setActive(anime.id)}
          onFocus={() => setActive(anime.id)}
          onBlur={() => setActive(null)}
        >
          <span className="nexus-world-node-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={anime.image} alt="" loading="lazy" />
          </span>
          <span className="nexus-world-node-copy">
            <small>FIELD PICK · {String(index + 1).padStart(2, "0")}</small>
            <strong>{anime.title}</strong>
            <i>{anime.year || "—"} · ★ {anime.score > 0 ? anime.score.toFixed(1) : "—"}</i>
          </span>
        </Link>
      ))}
    </div>
  );
}
