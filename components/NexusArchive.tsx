"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Anime } from "@/lib/types";
import { useHomePersonalizedPool } from "@/lib/use-home-personalized-pool";

type Props = { items: Anime[] };

const seasonIndex: Record<string, number> = { WINTER: 0, SPRING: 1, SUMMER: 2, FALL: 3 };

function seasonKey(a: Anime) {
  const year = Number(a.seasonYear || a.year || 0);
  const season = String(a.season || "").toUpperCase();
  return { year, season, index: seasonIndex[season] ?? -1 };
}

function seasonDistance(a: Anime, nowYear: number, nowSeason: number) {
  const s = seasonKey(a);
  if (!s.year || s.index < 0) return 99;
  return (s.year - nowYear) * 4 + (s.index - nowSeason);
}

function ArchiveGroup({ label, note, items, offset }: { label: string; note: string; items: Anime[]; offset: number }) {
  if (!items.length) return null;
  return (
    <section className="nexus-archive-group">
      <div className="nexus-archive-group-heading">
        <div><span>{label}</span><h3>{note}</h3></div>
        <small>{String(items.length).padStart(2, "0")} signals</small>
      </div>
      <div className="nexus-archive-wall">
        {items.map((anime, index) => (
          <Link key={anime.id} href={"/anime/" + anime.id} className={"nexus-archive-item nexus-archive-item--" + (((index + offset) % 9) + 1)} aria-label={"Open " + anime.title}>
            <div className="nexus-archive-art">
              <img src={anime.image} alt="" loading={index < 4 ? "eager" : "lazy"} />
              <span>{String(index + offset + 1).padStart(2, "0")}</span>
              <div className="nexus-archive-caption">
                <strong>{anime.title}</strong>
                <small>{anime.year || "—"} · {anime.format || "SERIES"} · ★ {anime.score > 0 ? anime.score.toFixed(1) : "—"}</small>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function NexusArchive({ items }: Props) {
  const { pool } = useHomePersonalizedPool(items, 160);
  const groups = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const nowSeason = month <= 3 ? 0 : month <= 6 ? 1 : month <= 9 ? 2 : 3;
    const nowYear = now.getFullYear();
    const current: Anime[] = [], next: Anime[] = [], previous: Anime[] = [], archive: Anime[] = [];
    for (const anime of pool) {
      const d = seasonDistance(anime, nowYear, nowSeason);
      if (d === 0 || (anime.status === "RELEASING" && Number(anime.seasonYear || anime.year) === nowYear)) current.push(anime);
      else if ((d > 0 && d <= 4) || anime.status === "NOT_YET_RELEASED") next.push(anime);
      else if (d < 0 && d >= -4) previous.push(anime);
      else archive.push(anime);
    }
    return {
      current: current.slice(0, 12),
      next: next.slice(0, 10),
      previous: previous.slice(0, 10),
      archive: archive.slice(0, 18),
    };
  }, [pool]);

  if (!pool.length) return null;
  return (
    <div className="nexus-archive-groups">
      <ArchiveGroup label="NOW / NEW RELEASES" note="Current season" items={groups.current} offset={0} />
      <ArchiveGroup label="NEXT / INCOMING" note="Future seasons" items={groups.next} offset={groups.current.length} />
      <ArchiveGroup label="RECENT / JUST PASSED" note="Previous season" items={groups.previous} offset={groups.current.length + groups.next.length} />
      <ArchiveGroup label="THE ARCHIVE" note="Older worlds" items={groups.archive} offset={groups.current.length + groups.next.length + groups.previous.length} />
    </div>
  );
}
