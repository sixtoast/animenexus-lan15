"use client";

import Link from "next/link";
import { useHomePersonalizedPool } from "@/lib/use-home-personalized-pool";
import type { Anime } from "@/lib/types";

export function HomePersonalizedIndex({ candidates }: { candidates: Anime[] }) {
  const { pool, ready, entries } = useHomePersonalizedPool(candidates, 120);
  const feature = pool.slice(1, 7);
  if (!feature.length) return null;
  return (
    <div className="nexus-index-personalized">
      <div className="nexus-feature-field">
        {feature.map((a, i) => (
          <Link key={a.id} href={"/anime/" + a.id} className={"nexus-index-card nexus-index-card--" + (i + 1)}>
            <div className="nexus-index-art">
              <img src={a.image} alt="" loading={i < 3 ? "eager" : "lazy"} />
              <span>{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="nexus-index-meta">
              <strong>{a.title}</strong>
              <small>{a.year || "—"} · {a.format || "SERIES"} · ★ {a.score > 0 ? a.score.toFixed(1) : "—"}</small>
            </div>
          </Link>
        ))}
      </div>
      <div className="nexus-personal-signal-note">
        {ready && entries.length >= 2 ? "INDEX CURATED FROM YOUR TASTE VECTOR" : "INDEX · DISCOVERY MODE"}
      </div>
    </div>
  );
}

export function HomeBeyondObvious({ candidates }: { candidates: Anime[] }) {
  const { pool, ready, entries } = useHomePersonalizedPool(candidates, 120);
  const anime = pool[7];
  if (!anime) return null;
  const background = "linear-gradient(90deg, rgba(7,8,11,.94), rgba(7,8,11,.58) 45%, rgba(7,8,11,.86)), url('" + anime.image.replace(/'/g, "%27") + "')";
  return (
    <div className="nexus-index-cut" style={{ backgroundImage: background }}>
      <span>BEYOND THE OBVIOUS</span>
      <strong>NOT THE<br />EXPECTED PICK.</strong>
      <Link href={"/anime/" + anime.id} className="nexus-index-cut-link">
        <span>{ready && entries.length >= 2 ? "Lantern found this near your taste" : "Continue with"}</span>
        <strong>{anime.title}</strong>
        <i>Open title ↗</i>
      </Link>
    </div>
  );
}
