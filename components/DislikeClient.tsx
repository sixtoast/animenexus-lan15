"use client";

import { useState } from "react";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { AnimeCard } from "@/components/AnimeCard";

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
  const [anime, setAnime] = useState<Anime | null>(null);
  const [recs, setRecs] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [alts, setAlts] = useState<string[]>([]);

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
    try {
      const params = new URLSearchParams({
        genres: genres.join(","),
        exclude: String(anime.id),
        mode: "popular",
      });
      const res = await fetch(`/api/recommend?${params}`);
      const j = await res.json();
      setRecs((j.data || []) as Anime[]);
    } catch {
      setRecs([]);
    } finally {
      setLoading(false);
    }
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
          onClick={run}
        >
          {loading ? "Reversing…" : "Reverse signal"}
        </button>
      </div>
      {alts.length > 0 ? (
        <p className="tools-hint" style={{ marginTop: 12 }}>
          Steering toward: {alts.join(" · ")}
        </p>
      ) : null}
      {recs.length > 0 ? (
        <div className="anime-grid" style={{ marginTop: 20 }}>
          {recs.slice(0, 12).map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
