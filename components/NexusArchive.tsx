"use client";

import Link from "next/link";
import { useHomePersonalization } from "@/components/HomePersonalization";
import type { Anime } from "@/lib/types";

type Props = { items: Anime[] };

function Wall({ items, offset = 0 }: { items: Anime[]; offset?: number }) {
  return (
    <div className="nexus-archive-wall">
      {items.slice(0, 12).map((anime, index) => (
        <Link key={anime.id} href={`/anime/${anime.id}`} className={`nexus-archive-item nexus-archive-item--${((index + offset) % 9) + 1}`} aria-label={`Open ${anime.title}`}>
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

export function NexusArchive({ items }: Props) {
  const { items: personalised, currentSeason, previousSeason, upcoming, archive } = useHomePersonalization();
  const source = personalised.length ? personalised : items;
  if (!source.length) return null;

  const current = currentSeason.length ? currentSeason : source.filter((a) => a.status === "RELEASING").slice(0, 12);
  const next = upcoming.length ? upcoming : source.filter((a) => a.status === "NOT_YET_RELEASED").slice(0, 12);
  const previous = previousSeason.length ? previousSeason : source.filter((a) => Number(a.seasonYear || a.year) === new Date().getFullYear() - 1).slice(0, 12);
  const older = archive.length ? archive : source.filter((a) => !current.includes(a) && !previous.includes(a) && !next.includes(a)).slice(0, 18);

  return (
    <div className="nexus-archive-seasons">
      {current.length ? (
        <section className="nexus-archive-season">
          <div className="nexus-archive-season-head"><span>NOW / CURRENT SIGNALS</span><small>Releasing and active in the present cycle</small></div>
          <Wall items={current} />
        </section>
      ) : null}
      {previous.length ? (
        <section className="nexus-archive-season">
          <div className="nexus-archive-season-head"><span>PREVIOUS / LAST SEASON</span><small>Recent releases from the preceding cycle</small></div>
          <Wall items={previous} offset={2} />
        </section>
      ) : null}
      {next.length ? (
        <section className="nexus-archive-season">
          <div className="nexus-archive-season-head"><span>NEXT / UPCOMING</span><small>Not yet released · future signals</small></div>
          <Wall items={next} offset={3} />
        </section>
      ) : null}
      {older.length ? (
        <section className="nexus-archive-season nexus-archive-season--older">
          <div className="nexus-archive-season-head"><span>ARCHIVE / EARLIER WORLDS</span><small>Older releases outside the current cycle</small></div>
          <Wall items={older} offset={6} />
        </section>
      ) : null}
    </div>
  );
}
