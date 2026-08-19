"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readMemory, recordView } from "@/lib/lantern-memory";
import { useWatchlist } from "@/components/WatchlistProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/Button";
import { fireSeal } from "@/components/SealMoment";
import type { Anime } from "@/lib/types";
import { pickIndex } from "@/lib/season";
import {
  rankRecommendations,
  confidenceCopy,
  whyThisIsHere,
  type RankedRecommendation,
} from "@/lib/recommend-rank";
import {
  markRecShown,
  markRecOpened,
  markRecAccepted,
  markRecRejected,
  rejectedAnimeIds,
  REJECT_REASON_LABELS,
  type RejectReason,
} from "@/lib/recommend-feedback";

type Props = {
  pool: Anime[];
  seed: number;
  dateLabel: string;
};

function observation(anime: Anime, ranked: RankedRecommendation | null): string {
  if (ranked && ranked.reasons[0]) {
    return `${confidenceCopy(ranked.confidence)}. ${whyThisIsHere(ranked)}`;
  }
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

export function DailyRitual({ pool, seed, dateLabel }: Props) {
  const { add, isInList, ready, entries } = useWatchlist();
  const { showToast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const rankedList = useMemo(() => {
    if (!ready) return [] as RankedRecommendation[];
    if (entries.length < 1) return [];
    const exclude = new Set<number>([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
    ]);
    return rankRecommendations(pool, entries, {
      excludeIds: exclude,
      resonanceWeight: 0.7,
    });
  }, [ready, entries, pool]);

  const anime = useMemo(() => {
    if (rankedList.length > 0) {
      const i = pickIndex(seed, rankedList.length);
      return rankedList[i]?.anime ?? pool[pickIndex(seed, pool.length)];
    }
    return pool[pickIndex(seed, pool.length)] ?? pool[0];
  }, [rankedList, pool, seed]);

  const rankedMeta = useMemo(() => {
    return rankedList.find((r) => r.anime.id === anime?.id) ?? null;
  }, [rankedList, anime]);

  const line = anime ? observation(anime, rankedMeta) : "…";

  useEffect(() => {
    if (!anime) return;
    markRecShown(anime.id);
  }, [anime]);

  if (!anime) {
    return (
      <div className="state-box lantern-empty">
        <h3>No pick on the desk</h3>
        <p>The pool came back empty after ranking.</p>
      </div>
    );
  }

  if (dismissed) {
    return (
      <div className="state-box lantern-empty">
        <h3>Signal passed</h3>
        <p>Lantern noted the pass. The seed still holds — a new channel tomorrow.</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/browse" className="btn btn-outline btn-sm">
            Browse instead
          </Link>
        </p>
      </div>
    );
  }

  function accept() {
    recordView({
      id: anime.id,
      title: anime.title,
      image: anime.image,
      genres: anime.tags,
      studios: anime.studios,
    });
    markRecAccepted(anime.id);
    if (ready && !isInList(anime.id)) {
      add(anime, "planning");
      fireSeal(anime.title, "seal");
      showToast("Daily signal sealed", "🕯️", true);
    } else {
      showToast("Signal noted", "📡");
    }
    setAccepted(true);
  }

  function reject(reason: RejectReason) {
    markRecRejected(anime.id, reason);
    setDismissed(true);
    setShowReject(false);
    showToast("Passed for today", "📡");
  }

  return (
    <div className="daily-ritual">
      <div className="daily-ritual-line">
        <span className="daily-ritual-kicker">Lantern · {dateLabel}</span>
        <p>{line}</p>
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
            {rankedMeta ? (
              <span className="detail-pill">
                {confidenceCopy(rankedMeta.confidence)}
              </span>
            ) : null}
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
            <Link
              href={`/anime/${anime.id}`}
              className="btn btn-outline btn-sm"
              onClick={() => markRecOpened(anime.id)}
            >
              Open detail
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReject((v) => !v)}
              disabled={accepted}
            >
              Not for me
            </Button>
            <Link href="/browse" className="btn btn-outline btn-sm">
              Browse instead
            </Link>
          </div>
          {showReject ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 10,
              }}
            >
              {(Object.keys(REJECT_REASON_LABELS) as RejectReason[]).map(
                (reason) => (
                  <button
                    key={reason}
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => reject(reason)}
                  >
                    {REJECT_REASON_LABELS[reason]}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
