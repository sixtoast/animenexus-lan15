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
import { readIntentSession } from "@/lib/intent-session";
import { useSessionRevision } from "@/lib/use-session-revision";
import { logOutcome } from "@/lib/outcome-events";

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
  const sessionKey = useSessionRevision();

  const rankedList = useMemo(() => {
    if (!ready) return [] as RankedRecommendation[];
    if (entries.length < 1) return [];
    const exclude = new Set<number>([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
    ]);
    const sess = readIntentSession();
    return rankRecommendations(pool, entries, {
      excludeIds: exclude,
      resonanceWeight: 0.7,
      experienceSlug: sess.slug || undefined,
    });
  }, [ready, entries, pool, sessionKey]);

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
    logOutcome(anime.id, "shown", { surface: "daily" });
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
        <p>
          Lantern noted the pass. The seed still holds — a new channel tomorrow.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link href="/browse" className="btn btn-outline btn-sm">
            Browse instead
          </Link>
        </p>
      </div>
    );
  }

  function accept() {
    if (!anime) return;
    add(anime, { watchStatus: "planning" });
    markRecAccepted(anime.id);
    logOutcome(anime.id, "started", { surface: "daily" });
    recordView({
      id: anime.id,
      title: anime.title,
      image: anime.image,
    });
    fireSeal();
    setAccepted(true);
    showToast(`Sealed · ${anime.title}`, "✦", true);
  }

  function reject(reason: RejectReason) {
    if (!anime) return;
    markRecRejected(anime.id, reason);
    logOutcome(anime.id, "dropped", { surface: "daily" });
    setShowReject(false);
    setDismissed(true);
    showToast("Pass noted", "·", true);
  }

  return (
    <article className="daily-ritual">
      <header className="daily-ritual-head">
        <span className="daily-kicker">{dateLabel}</span>
        <h2>Today’s signal</h2>
      </header>

      <div className="daily-ritual-body">
        <Link
          href={`/anime/${anime.id}`}
          className="daily-poster"
          onClick={() => markRecOpened(anime.id)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={anime.image} alt="" />
        </Link>
        <div className="daily-copy">
          <h3>
            <Link href={`/anime/${anime.id}`} onClick={() => markRecOpened(anime.id)}>
              {anime.title}
            </Link>
          </h3>
          <p className="daily-obs">{line}</p>
          {rankedMeta ? (
            <p className="meta" style={{ marginTop: 8 }}>
              {confidenceCopy(rankedMeta.confidence)}
              {rankedMeta.reasons[0] ? ` · ${rankedMeta.reasons[0]}` : ""}
            </p>
          ) : null}
          <div className="daily-actions">
            {!accepted ? (
              <>
                <Button type="button" variant="accent" onClick={accept}>
                  {isInList(anime.id) ? "Already on shelf" : "Seal to list"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReject((v) => !v)}
                >
                  Pass
                </Button>
              </>
            ) : (
              <p className="meta">Sealed for later — the desk remembers.</p>
            )}
          </div>
          {showReject ? (
            <div className="daily-reject" role="group" aria-label="Why pass">
              {(Object.keys(REJECT_REASON_LABELS) as RejectReason[]).map(
                (r) => (
                  <button
                    key={r}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => reject(r)}
                  >
                    {REJECT_REASON_LABELS[r]}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
