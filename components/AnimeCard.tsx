"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Anime } from "@/lib/types";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readMemory } from "@/lib/lantern-memory";
import { emitAnimeHoverStart, emitAnimeHoverEnd } from "@/lib/nexus";

type Props = {
  anime: Anime;
  index?: number;
};

export function AnimeCard({ anime, index = 0 }: Props) {
  const router = useRouter();
  const { isInList, ready } = useWatchlist();
  const onList = ready && isInList(anime.id);
  const [recent, setRecent] = useState(false);
  const score = anime.score > 0 ? anime.score.toFixed(1) : "—";
  const vt = `cover-${anime.id}`;
  const href = `/anime/${anime.id}`;
  const src = anime.image || "https://placehold.co/300x450/1a1a1a/555?text=?";
  const canOptimize =
    src.includes("anilist.co") ||
    src.includes("myanimelist.net") ||
    src.includes("placehold.co");

  useEffect(() => {
    const m = readMemory();
    setRecent(m.recentViews.some((r) => r.id === anime.id));
  }, [anime.id]);

  function navigate(e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (!doc.startViewTransition) return;
    e.preventDefault();
    doc.startViewTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link
      onMouseEnter={() => emitAnimeHoverStart(anime.id)}
      onMouseLeave={() => emitAnimeHoverEnd(anime.id)}
      href={href}
      className={
        "anime-card" +
        (onList ? " on-list" : "") +
        (recent ? " was-viewed" : "")
      }
      style={{ viewTransitionName: vt, animationDelay: `${Math.min(index, 12) * 30}ms` }}
      onClick={navigate}
    >
      <div className="poster-wrap">
        <Image
          src={src}
          alt=""
          width={300}
          height={450}
          className="poster"
          unoptimized={!canOptimize}
        />
        <span className="score-badge">{score}</span>
      </div>
      <div className="card-meta">
        <h3 className="card-title">{anime.title}</h3>
        <p className="card-sub">
          {[anime.format, anime.year].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
