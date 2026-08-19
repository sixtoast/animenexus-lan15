"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { AnimeCard } from "@/components/AnimeCard";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  rankRecommendations,
  whyThisIsHere,
  confidenceCopy,
  type RankedRecommendation,
} from "@/lib/recommend-rank";
import {
  markRecShown,
  markRecOpened,
  markRecRejected,
  rejectedAnimeIds,
  REJECT_REASON_LABELS,
  type RejectReason,
} from "@/lib/recommend-feedback";

const ALT: Record<string, string[]> = {
  Action: ["Slice of Life", "Romance", "Comedy"],
  Horror: ["Comedy", "Slice of Life", "Music"],
  Romance: ["Action", "Sci-Fi", "Sports"],
  "Sci-Fi": ["Romance", "Historical", "Music"],
  Mecha: ["Slice of Life", "Romance", "Gourmet"],
  Thriller: ["Comedy", "Music", "Sports"],
  Drama: ["Comedy", "Sports", "Adventure"],
  Comedy: ["Thriller", "Horror", "Mystery"],
};

export function DislikeClient() {
  const { entries } = useWatchlist();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [raw, setRaw] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [alts, setAlts] = useState<string[]>([]);
  const [rejectFor, setRejectFor] = useState<number | null>(null);
  const shownRef = useRef<Set<number>>(new Set());

  const ranked: RankedRecommendation[] = useMemo(() => {
    if (!raw.length) return [];
    const exclude = new Set<number>([
      ...entries.map((e) => e.id),
      ...rejectedAnimeIds(),
      ...(anime ? [anime.id] : []),
    ]);
    return rankRecommendations(raw, entries, { excludeIds: exclude });
  }, [raw, entries, anime]);

  useEffect(() => {
    for (const r of ranked.slice(0, 12)) {
      if (shownRef.current.has(r.anime.id)) continue;
      shownRef.current.add(r.anime.id);
      markRecShown(r.anime.id);
    }
  }, [ranked]);

  async function run() {
    if (!anime) return;
    const avoided = anime.tags || [];
    const suggested = new Set<string>();
    for (const g of avoided) {
      for (const a of ALT[g] || []) suggested.add(a);
    }
    const list = [...suggested].filter(
      (g) => !avoided.map((x) => x.toLowerCase()).includes(g.toLowerCase()),
    );
    const genres =
      list.slice(0, 3).length > 0
        ? list.slice(0, 3)
        : ["Comedy", "Slice of Life", "Adventure"];
    setAlts(genres);
    setLoading(true);
    shownRef.current = new Set();
    try {
      const params = new URLSearchParams({
        genres: genres.join(","),
        exclude: String(anime.id),
        mode: "popular",
      });
      const res = await fetch(`/api/recommend?${params}`);
      const j = await res.json();
      setRaw((j.data || []) as Anime[]);
    } catch {
      setRaw([]);
    } finally {
      setLoading(false);
    }
  }

  function onReject(id: number, reason: RejectReason) {
    markRecRejected(id, reason);
    setRaw((prev) => prev.filter((a) => a.id !== id));
    setRejectFor(null);
  }

  return (
    <div className="tools-panel">
      <AnimeSearchPicker
        label="Title you didn’t vibe with"
        selected={anime}
        onSelect={setAnime}
      />
      <div className="daily-actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-accent btn-sm"
          disabled={!anime || loading}
          onClick={() => void run()}
        >
          {loading ? "Reversing…" : "Reverse signal"}
        </button>
      </div>
      {alts.length > 0 ? (
        <p className="tools-hint" style={{ marginTop: 12 }}>
          Steering toward: {alts.join(" · ")}
        </p>
      ) : null}

      {ranked.length > 0 ? (
        <div style={{ marginTop: 20, display: "grid", gap: 20 }}>
          {ranked.slice(0, 12).map((r) => (
            <div key={r.anime.id}>
              <div
                onClick={() => markRecOpened(r.anime.id)}
                onKeyDown={undefined}
                role="presentation"
              >
                <AnimeCard anime={r.anime} />
              </div>
              <p className="tools-hint" style={{ marginTop: 8 }}>
                <strong>{confidenceCopy(r.confidence)}</strong>
                {" — "}
                {whyThisIsHere(r)}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    setRejectFor(rejectFor === r.anime.id ? null : r.anime.id)
                  }
                >
                  Not for me
                </button>
              </div>
              {rejectFor === r.anime.id ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 8,
                  }}
                >
                  {(Object.keys(REJECT_REASON_LABELS) as RejectReason[]).map(
                    (reason) => (
                      <button
                        key={reason}
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onReject(r.anime.id, reason)}
                      >
                        {REJECT_REASON_LABELS[reason]}
                      </button>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
