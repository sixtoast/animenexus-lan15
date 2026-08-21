"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Anime } from "@/lib/types";
import { useWatchlist } from "@/components/WatchlistProvider";
import { AnimeImage } from "@/components/AnimeImage";
import {
  materialCssVars,
  materialFromAnimeEntity,
} from "@/lib/anime-material";
import { readMemory } from "@/lib/lantern-memory";
import { emitAnimeHoverStart, emitAnimeHoverEnd } from "@/lib/nexus";
import { markRecOpened } from "@/lib/recommend-feedback";
import { withViewTransition } from "@/lib/view-transition";

type Props = {
  anime: Anime;
  index?: number;
  /** Soft recommendation treatment (e.g. Home For you). */
  recommended?: boolean;
};

function episodeCap(anime: Anime, entryEpisodes?: number | string): number {
  const raw = entryEpisodes ?? anime.episodes;
  const n =
    typeof raw === "number" ? raw : parseInt(String(raw || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

/**
 * Stateful catalog card + resonance material (Awwwards Sprint 2).
 */
export function AnimeCard({ anime, index = 0, recommended = false }: Props) {
  const router = useRouter();
  const { getEntry, ready } = useWatchlist();
  const entry = ready ? getEntry(anime.id) : undefined;
  const status = entry?.watchStatus;
  const [recent, setRecent] = useState(false);
  const score = anime.score > 0 ? anime.score.toFixed(1) : "—";
  const vt = `cover-${anime.id}`;
  const href = `/anime/${anime.id}`;

  const materialVars = useMemo(
    () => materialCssVars(materialFromAnimeEntity(anime)),
    [anime],
  );

  const progressPct = useMemo(() => {
    if (!entry || entry.watchStatus !== "watching") return 0;
    const cap = episodeCap(anime, entry.episodes);
    return Math.min(100, Math.round(((entry.progress || 0) / cap) * 100));
  }, [entry, anime]);

  useEffect(() => {
    const m = readMemory();
    setRecent(m.recentViews.some((r) => r.id === anime.id));
  }, [anime.id]);

  const stateClass = [
    "anime-card",
    "grid-enter",
    status === "watching"
      ? "is-watching"
      : status === "completed"
        ? "is-completed"
        : status === "paused"
          ? "is-paused"
          : status === "dropped"
            ? "is-dropped"
            : status === "planning" || entry
              ? "is-sealed"
              : "",
    recent && !entry ? "is-recent" : "",
    recommended && !entry ? "is-recommended" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ariaState = status
    ? status === "watching"
      ? `Watching, episode ${entry?.progress ?? 0}`
      : status === "completed"
        ? "Completed"
        : status === "planning"
          ? "On shelf, planning"
          : status === "paused"
            ? "Paused"
            : status === "dropped"
              ? "Dropped"
              : "On shelf"
    : recent
      ? "Recently opened"
      : recommended
        ? "Recommended for your shelf"
        : undefined;

  function navigate(e: React.MouseEvent) {
    markRecOpened(anime.id);
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    withViewTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link
      href={href}
      className={stateClass}
      title={anime.title}
      aria-label={ariaState ? `${anime.title}. ${ariaState}` : anime.title}
      data-on-list={entry ? "true" : "false"}
      data-anime-object-id={String(anime.id)}
      data-status={
        status || (recent ? "recent" : recommended ? "recommended" : "default")
      }
      onClick={navigate}
      onMouseEnter={() => emitAnimeHoverStart(anime.id)}
      onMouseLeave={() => emitAnimeHoverEnd(anime.id)}
      style={
        {
          "--i": index,
          "--vt-cover": vt,
          "--progress": `${progressPct}%`,
          ...materialVars,
        } as React.CSSProperties
      }
    >
      <span className="card-status-ring" aria-hidden />

      <AnimeImage
        src={anime.image}
        title={anime.title}
        decorative
        width={300}
        height={450}
        sizes="(max-width: 640px) 45vw, 160px"
        viewTransitionName={vt}
      />

      {status === "watching" && progressPct > 0 ? (
        <span
          className="card-progress"
          aria-hidden
          style={{ width: `${progressPct}%` }}
        />
      ) : null}

      {anime.format ? <span className="card-tag">{anime.format}</span> : null}
      <div className="card-body">
        <div className="card-title">{anime.title}</div>
        <div className="card-meta">
          <span>{anime.year || "—"}</span>
          <span className="card-score">★ {score}</span>
        </div>
      </div>
    </Link>
  );
}
