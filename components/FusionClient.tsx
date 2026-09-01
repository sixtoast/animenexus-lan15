"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { fusionBlurb, fusionScore, sharedTags } from "@/lib/tools";
import { AnimeCard } from "@/components/AnimeCard";
import { useWatchlist } from "@/components/WatchlistProvider";
import { rankRecommendations } from "@/lib/recommend-rank";
import { rejectedAnimeIds } from "@/lib/recommend-feedback";
import { emitNexus } from "@/lib/nexus";
import { readIntentSession } from "@/lib/intent-session";
import { useSessionRevision } from "@/lib/use-session-revision";
import { SessionRankHint } from "@/components/SessionRankHint";

export function FusionClient() {
  const { entries, ready } = useWatchlist();
  const sessionKey = useSessionRevision();
  const [a, setA] = useState<Anime | null>(null);
  const [b, setB] = useState<Anime | null>(null);
  const [raw, setRaw] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  const pairReady = a && b;
  const shared = pairReady ? sharedTags(a!, b!) : [];

  useEffect(() => {
    emitNexus({ type: "tool_opened", tool: "fusion" });
  }, []);

  useEffect(() => {
    if (!a || !b) {
      setRaw([]);
      return;
    }
    const genres = shared.length
      ? shared
      : Array.from(new Set([...(a.tags || []), ...(b.tags || [])])).slice(0, 4);
    if (!genres.length) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      genres: genres.join(","),
      exclude: `${a.id},${b.id}`,
      mode: "score",
    });
    fetch(`/api/recommend?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setRaw((j.data || []) as Anime[]);
      })
      .catch(() => {
        if (!cancelled) setRaw([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [a, b, shared.join("|")]);

  const recs = useMemo(() => {
    if (!raw.length) return [] as Anime[];
    if (!ready || entries.length < 2) return raw;
    const exclude = new Set<number>([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
      ...(a ? [a.id] : []),
      ...(b ? [b.id] : []),
    ]);
    const sess = readIntentSession();
    const ranked = rankRecommendations(raw, entries, {
      excludeIds: exclude,
      resonanceWeight: 0.55,
      experienceSlug: sess.slug || undefined,
    });
    if (!ranked.length) return raw;
    const ids = new Set(ranked.map((r) => r.anime.id));
    const tail = raw.filter((x) => !ids.has(x.id));
    return [...ranked.map((r) => r.anime), ...tail];
  }, [raw, ready, entries, a, b, sessionKey]);

  const shelfTuned = ready && entries.length >= 2 && recs.length > 0;

  return (
    <div className="tools-panel">
      <div className="tools-pickers">
        <AnimeSearchPicker label="Parent A" selected={a} onSelect={setA} />
        <AnimeSearchPicker label="Parent B" selected={b} onSelect={setB} />
      </div>

      {pairReady ? (
        <div className="fusion-result">
          <div className="fusion-covers">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a!.image} alt="" />
            <span className="fusion-x">×</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b!.image} alt="" />
          </div>
          <div className="fusion-score">
            Compatibility {fusionScore(a!, b!)}
            <small>/100</small>
          </div>
          <p className="fusion-blurb">{fusionBlurb(a!, b!)}</p>
          <div className="compare-tags">
            {shared.map((t) => (
              <span key={t} className="taste-chip shared">
                {t}
              </span>
            ))}
          </div>
          <div className="daily-actions" style={{ marginTop: 16 }}>
            <Link href={`/anime/${a!.id}`} className="btn btn-outline btn-sm">
              {a!.title}
            </Link>
            <Link href={`/anime/${b!.id}`} className="btn btn-outline btn-sm">
              {b!.title}
            </Link>
          </div>

          <section style={{ marginTop: 28, textAlign: "left" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: 12 }}>
              Catalog children (genre blend)
            </h3>
            <SessionRankHint
              fallback={
                shelfTuned ? (
                  <p className="tools-hint" role="status" aria-live="polite">
                    Soft-ranked for your shelf within this blend — not a
                    scoreboard.
                  </p>
                ) : null
              }
            />
            {loading ? (
              <p className="tools-hint">Scanning AniList…</p>
            ) : recs.length ? (
              <div className="anime-grid">
                {recs.slice(0, 12).map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>
            ) : (
              <p className="tools-hint">No strong children found for this blend.</p>
            )}
          </section>
        </div>
      ) : (
        <p className="tools-hint">
          Fuse two signals — shared genres raise compatibility and unlock
          catalog recommendations.
        </p>
      )}
    </div>
  );
}
