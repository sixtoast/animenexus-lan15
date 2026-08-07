"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { fusionBlurb, fusionScore, sharedTags } from "@/lib/tools";
import { AnimeCard } from "@/components/AnimeCard";

export function FusionClient() {
  const [a, setA] = useState<Anime | null>(null);
  const [b, setB] = useState<Anime | null>(null);
  const [recs, setRecs] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  const ready = a && b;
  const shared = ready ? sharedTags(a!, b!) : [];

  useEffect(() => {
    if (!a || !b) {
      setRecs([]);
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
        if (!cancelled) setRecs((j.data || []) as Anime[]);
      })
      .catch(() => {
        if (!cancelled) setRecs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [a, b, shared.join("|")]);

  return (
    <div className="tools-panel">
      <div className="tools-pickers">
        <AnimeSearchPicker label="Parent A" selected={a} onSelect={setA} />
        <AnimeSearchPicker label="Parent B" selected={b} onSelect={setB} />
      </div>

      {ready ? (
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
