"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readMemory, recordView } from "@/lib/lantern-memory";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { fireSeal } from "@/components/SealMoment";
import type { Anime } from "@/lib/types";

type Props = {
  anime: Anime;
  dateLabel: string;
};

function observation(anime: Anime): string {
  const m = readMemory();
  const h = new Date().getHours();
  const seen = m.recentViews.some((r) => r.id === anime.id);
  const top = Object.entries(m.genreCounts).sort((a, b) => b[1] - a[1])[0];
  const genreHit =
    top && anime.tags?.some((t) => t.toLowerCase() === top[0].toLowerCase());

  if (seen) {
    return `You’ve already brushed past “${anime.title}”. Lantern put it on the desk again — sometimes a second look is the real signal.`;
  }
  if (genreHit && top) {
    return `Your orbit has been leaning ${top[0]}. Today’s pick sits in that frequency.`;
  }
  if (h >= 21 || h < 5) {
    return `Late broadcast. One title for the night — no pressure to finish, only to begin.`;
  }
  if (h < 12) {
    return `Morning desk. A single signal so the day has a thread to pull.`;
  }
  return `Lantern chose one title for ${new Date().toLocaleDateString(undefined, { weekday: "long" })}. The seed holds until midnight.`;
}

export function DailyRitual({ anime, dateLabel }: Props) {
  const { add, isInList, ready } = useWatchlist();
  const { showToast } = useToast();
  const [line, setLine] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    setLine(observation(anime));
  }, [anime]);

  function accept() {
    recordView({
      id: anime.id,
      title: anime.title,
      image: anime.image,
      genres: anime.tags,
      studios: anime.studios,
    });
    if (ready && !isInList(anime.id)) {
      add(anime, "planning");
      fireSeal(anime.title, "seal");
      showToast("Daily signal sealed", "🕯️", true);
    } else {
      showToast("Signal noted", "📡");
    }
    setAccepted(true);
  }

  return (
    <div className="daily-ritual">
      <div className="daily-ritual-line">
        <span className="daily-ritual-kicker">Lantern · {dateLabel}</span>
        <p>{line || "…"}</p>
      </div>

      <article className="daily-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="daily-cover" src={anime.image} alt="" />
        <div className="daily-body">
          <p className="daily-kicker">Today’s signal</p>
          <h2 className="daily-title">{anime.title}</h2>
          {anime.titleNative ? (
            <p className="daily-native">{anime.titleNative}</p>
          ) : null}
          <div className="daily-meta">
            {anime.score > 0 ? (
              <span className="detail-pill score">
                ★ {anime.score.toFixed(1)}
              </span>
            ) : null}
            <span className="detail-pill">{anime.format}</span>
            {anime.year ? (
              <span className="detail-pill">{anime.year}</span>
            ) : null}
            {anime.tags?.slice(0, 3).map((g) => (
              <span key={g} className="detail-pill">
                {g}
              </span>
            ))}
          </div>
          <p className="daily-desc">
            {(anime.description || "").slice(0, 320)}
            {(anime.description || "").length > 320 ? "…" : ""}
          </p>
          <div className="daily-actions">
            <Button
              variant="accent"
              size="sm"
              onClick={accept}
              disabled={accepted}
            >
              {accepted ? "Signal accepted" : "Accept signal"}
            </Button>
            <Link href={`/anime/${anime.id}`} className="btn btn-outline btn-sm">
              Open detail
            </Link>
            <Link href="/browse" className="btn btn-outline btn-sm">
              Browse instead
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
