import Link from "next/link";
import type { Anime } from "@/lib/types";

type Props = { items: Anime[] };

export function NexusArchive({ items }: Props) {
  const archive = items.slice(0, 18);
  if (!archive.length) return null;

  return (
    <div className="nexus-archive-wall">
      {archive.map((anime, index) => (
        <Link
          key={anime.id}
          href={`/anime/${anime.id}`}
          className={`nexus-archive-item nexus-archive-item--${(index % 9) + 1}`}
          aria-label={`Open ${anime.title}`}
        >
          <div className="nexus-archive-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={anime.image} alt="" loading={index < 6 ? "eager" : "lazy"} />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div className="nexus-archive-caption">
              <strong>{anime.title}</strong>
              <small>{anime.year || "—"} · {anime.format || "SERIES"} · ★ {anime.score > 0 ? anime.score.toFixed(1) : "—"}</small>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
