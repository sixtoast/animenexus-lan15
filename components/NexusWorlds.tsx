import Link from "next/link";
import type { Anime } from "@/lib/types";

type Props = { candidates: Anime[] };

export function NexusWorlds({ candidates }: Props) {
  const worlds = candidates.slice(7, 14);
  if (!worlds.length) return null;

  return (
    <div className="nexus-world-map">
      <div className="nexus-world-orbit nexus-world-orbit--one" aria-hidden />
      <div className="nexus-world-orbit nexus-world-orbit--two" aria-hidden />
      <div className="nexus-world-core">
        <span>DISCOVERY FIELD</span>
        <strong>Worlds<br /><em>nearby.</em></strong>
        <small>Stories connected by taste, tone and curiosity.</small>
      </div>
      {worlds.map((anime, index) => (
        <Link
          key={anime.id}
          href={`/anime/${anime.id}`}
          className={`nexus-world-node nexus-world-node--${index + 1}`}
        >
          <span className="nexus-world-node-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={anime.image} alt="" loading="lazy" />
          </span>
          <span className="nexus-world-node-copy">
            <small>{String(index + 1).padStart(2, "0")} · {anime.format || "SERIES"}</small>
            <strong>{anime.title}</strong>
            <i>{anime.year || "—"} · ★ {anime.score > 0 ? anime.score.toFixed(1) : "—"}</i>
          </span>
        </Link>
      ))}
    </div>
  );
}
