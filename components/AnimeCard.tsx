"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  getAnimeObjectId,
  getAnimeViewTransitionName,
  withViewTransition,
} from "@/lib/view-transition";

type Props = {
  anime: Anime;
  index?: number;
  recommended?: boolean;
};

function episodeCap(anime: Anime, entryEpisodes?: number | string): number {
  const raw = entryEpisodes ?? anime.episodes;
  const n =
    typeof raw === "number" ? raw : parseInt(String(raw || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

function isFinePointer(): boolean {
  try {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;
  }
}

export function AnimeCard({ anime, index = 0, recommended = false }: Props) {
  const router = useRouter();
  const { getEntry, ready } = useWatchlist();
  const entry = ready ? getEntry(anime.id) : undefined;
  const status = entry?.watchStatus;
  const [recent, setRecent] = useState(false);
  const [pressed, setPressed] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const rafRef = useRef(0);
  const score = anime.score > 0 ? anime.score.toFixed(1) : "—";
  const vt = getAnimeViewTransitionName(anime.id);
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
    pressed ? "is-pressed" : "",
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

  function onPointerMove(e: React.PointerEvent) {
    if (!isFinePointer()) return;
    const el = cardRef.current;
    if (!el) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ptr-x", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--ptr-y", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--ptr-nx", (x - 0.5).toFixed(3));
      el.style.setProperty("--ptr-ny", (y - 0.5).toFixed(3));
    });
  }

  function onPointerLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--ptr-x", "50%");
    el.style.setProperty("--ptr-y", "40%");
    el.style.setProperty("--ptr-nx", "0");
    el.style.setProperty("--ptr-ny", "0");
    setPressed(false);
    emitAnimeHoverEnd(anime.id);
  }

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
      ref={cardRef}
      href={href}
      className={stateClass}
      title={anime.title}
      aria-label={ariaState ? `${anime.title}. ${ariaState}` : anime.title}
      data-on-list={entry ? "true" : "false"}
      data-anime-object-id={getAnimeObjectId(anime.id)}
      data-status={
        status || (recent ? "recent" : recommended ? "recommended" : "default")
      }
      onClick={navigate}
      onPointerMove={onPointerMove}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={onPointerLeave}
      onMouseEnter={() => emitAnimeHoverStart(anime.id)}
      style={
        {
          "--i": index,
          "--vt-cover": vt,
          "--progress": `${progressPct}%`,
          "--ptr-x": "50%",
          "--ptr-y": "40%",
          "--ptr-nx": 0,
          "--ptr-ny": 0,
          ...materialVars,
        } as React.CSSProperties
      }
    >
      <span className="card-status-ring" aria-hidden />
      <span className="card-ptr-light" aria-hidden />

      <AnimeImage
        src={anime.image}
        title={anime.title}
        decorative
        width={300}
        height={450}
        sizes="(max-width: 640px) 45vw, 160px"
        viewTransitionName={vt}
        className="card-poster"
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
