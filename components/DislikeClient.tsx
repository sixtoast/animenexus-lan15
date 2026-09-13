"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { useWatchlist } from "@/components/WatchlistProvider";
import { emitNexus } from "@/lib/nexus";
import { getBestAvailableFingerprint } from "@/lib/intelligence/items/resolve-fingerprint";
import {
  DISLIKE_REASON_MAP,
  buildDislikeProfile,
  scoreReverseCandidate,
  type DislikeReasonId,
} from "@/lib/intelligence/semantic-ops/reverse";
import { fitToUserVector } from "@/lib/intelligence/semantic-ops/compare";
import {
  blendUserVector,
  buildUserPreferenceVector,
} from "@/lib/intelligence/preference/user-preference-vector";

type ReverseHit = {
  anime: Anime;
  avoidanceSatisfaction: number;
  preservationSatisfaction: number;
  userFit: number;
  finalScore: number;
  reasonSource: "explicit" | "inferred";
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function DislikeClient() {
  const { entries } = useWatchlist();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [reasons, setReasons] = useState<DislikeReasonId[]>([]);
  const [hits, setHits] = useState<ReverseHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    emitNexus({ type: "tool_opened", tool: "dislike" });
  }, []);

  function toggleReason(id: DislikeReasonId) {
    setReasons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function run() {
    if (!anime) return;
    setLoading(true);
    setHits([]);
    try {
      const liked = entries
        .filter((e) => e.watchStatus === "completed" || e.userRating >= 7)
        .slice(0, 40)
        .map((e) => ({
          id: e.id,
          title: e.title,
          genres: e.genres,
          score: e.score,
        })) as Anime[];

      const userVec =
        liked.length > 0
          ? blendUserVector(
              liked.map((a) => getBestAvailableFingerprint(a).fingerprint),
            )
          : buildUserPreferenceVector([]);

      const sourceFp = getBestAvailableFingerprint(anime);
      const profile = buildDislikeProfile(
        { animeId: anime.id, fingerprint: sourceFp.fingerprint },
        reasons,
        userVec,
      );

      const pools: Anime[] = [];
      const seen = new Set<number>([anime.id]);

      async function pull(url: string) {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const j = await res.json();
          for (const x of (j.data || []) as Anime[]) {
            if (!x?.id || seen.has(x.id)) continue;
            seen.add(x.id);
            pools.push(x);
          }
        } catch {
          /* isolate */
        }
      }

      // Do NOT exclude source genres — discovery only
      await pull(`/api/recommend?mode=popular`);
      await pull(`/api/recommend?mode=score`);

      const out: ReverseHit[] = [];
      for (const c of pools.slice(0, 80)) {
        const rc = getBestAvailableFingerprint(c);
        const userFit = userVec
          ? fitToUserVector(rc.fingerprint, userVec)
          : 0.5;
        const quality = c.score > 0 ? Math.min(1, c.score / 10) : 0.5;
        const scored = scoreReverseCandidate(
          rc.fingerprint,
          profile,
          userFit,
          quality,
        );
        out.push({
          anime: c,
          ...scored,
          userFit,
          reasonSource: profile.reasonSource,
        });
      }
      out.sort((x, y) => y.finalScore - x.finalScore);
      setHits(out.slice(0, 16));
    } finally {
      setLoading(false);
    }
  }

  const reasonList = useMemo(() => DISLIKE_REASON_MAP, []);

  return (
    <div className="tools-panel">
      <AnimeSearchPicker
        label="Title you disliked"
        selected={anime}
        onSelect={setAnime}
      />
      <p className="tools-hint">
        Reverse is selective — say what failed. Unselected traits can stay.
        Not “the opposite of X.”
      </p>
      <div
        className="dislike-reasons"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
      >
        {reasonList.map((r) => (
          <button
            key={r.id}
            type="button"
            className={
              "btn btn-sm " +
              (reasons.includes(r.id) ? "btn-accent" : "btn-outline")
            }
            onClick={() => toggleReason(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-accent"
          disabled={!anime || loading}
          onClick={() => void run()}
        >
          {loading ? "Scoring…" : "Find alternatives"}
        </button>
      </div>

      {hits.length > 0 && (
        <ul className="tools-results" style={{ marginTop: 16 }}>
          {hits.map((h) => (
            <li key={h.anime.id} className="tools-result-row">
              <Link href={`/anime/${h.anime.id}`} className="tools-result-link">
                <strong>{h.anime.title}</strong>
              </Link>
              <span className="tools-meta">
                avoid {pct(h.avoidanceSatisfaction)} · keep{" "}
                {pct(h.preservationSatisfaction)} · you {pct(h.userFit)} ·{" "}
                {pct(h.finalScore)} score
                {h.reasonSource === "inferred" ? " · inferred" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
