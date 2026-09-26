"use client";

import Link from "next/link";
import { useHomePersonalizedPool } from "@/lib/use-home-personalized-pool";
import type { Anime } from "@/lib/types";

export function HomeFeaturedSignal({ candidates }: { candidates: Anime[] }) {
  const { pool, ready, entries } = useHomePersonalizedPool(candidates, 120);
  const anime = pool[0];
  if (!anime) return null;
  const personalised = ready && entries.length >= 2;
  return (
    <Link href={"/anime/" + anime.id} className="nexus-opening-subject" aria-label={"Open featured title " + anime.title}>
      <div className="nexus-opening-subject-image">
        <div className="nexus-opening-subject-backplate" aria-hidden />
        <img className="nexus-opening-subject-echo" src={anime.image} alt="" aria-hidden />
        <img src={anime.image} alt="" />
      </div>
      <div className="nexus-opening-subject-info">
        <span>{personalised ? "FEATURED SIGNAL · FOR YOU" : "FEATURED SIGNAL"}</span>
        <strong>{anime.title}</strong>
        <small>{anime.year || "—"} · {anime.format || "SERIES"} · ★ {anime.score > 0 ? anime.score.toFixed(1) : "—"}</small>
      </div>
    </Link>
  );
}
