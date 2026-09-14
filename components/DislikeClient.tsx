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
import { retrieveAnimeCandidates } from "@/lib/intelligence/candidates/retrieve";

type ReverseHit = {
  anime: Anime;
  avoidanceSatisfaction: number;
  preservationSatisfaction: number;
  userFit: number;
  finalScore: number;
  reasonSource: "explicit" | "inferred";
  candidateSources: string[];
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
  const [meta, setMeta] = useState<{ attempted: string[]; count: number } | null>(
    null,
  );

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
    setMeta(null);
    try {
      const rs = getBestAvailableFingerprint(anime);
      let userVec: Record<string, number> | null = null;
      try {
        if (entries.length >= 2) {
          const user = buildUserPreferenceVector(entries);
          userVec = blendUserVector(user, {
            stable: 0.7,
            mediumTerm: 0.2,
            recent: 0.1,
            session: 0,
          });
        }
      } catch {
        userVec = null;
      }

      const profile = buildDislikeProfile(rs.fingerprint, reasons, userVec);

      try {
        const { indexFingerprint } = await import(
          "@/lib/intelligence/candidates/semantic-index"
        );
        const { ensureNexusId, identityFromAnime } = await import(
          "@/lib/anime-identity"
        );
        indexFingerprint(
          ensureNexusId(identityFromAnime(anime)).nexusId ||
            `anilist:${anime.id}`,
          rs.fingerprint,
        );
      } catch {
        /* index optional */
      }

      const { candidates, providersAttempted, uniqueCandidateCount } =
        await retrieveAnimeCandidates({
          intent: "reverse",
          seeds: [anime],
          excludeIds: [anime.id, ...entries.map((e) => e.id)],
          personal: [],
          limit: 120,
          targetFingerprint: rs.fingerprint,
        });
      setMeta({
        attempted: providersAttempted,
        count: uniqueCandidateCount,
      });

      const out: ReverseHit[] = [];
      for (const rec of candidates.slice(0, 80)) {
        const c = rec.anime;
        const rc =
          rec.fingerprint != null
            ? { fingerprint: rec.fingerprint }
            : getBestAvailableFingerprint(c);
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
          candidateSources: rec.sources,
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
      <div className="daily-actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-accent"
          disabled={!anime || loading}
          onClick={() => void run()}
        >
          {loading ? "Searching…" : "Find alternatives"}
        </button>
      </div>
      {meta ? (
        <p className="tools-hint">
          Candidates {meta.count} · sources {meta.attempted.join(", ") || "—"}
        </p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="tools-results" style={{ marginTop: 16 }}>
          {hits.map((h) => (
            <li key={h.anime.id}>
              <Link href={`/anime/${h.anime.id}`}>{h.anime.title}</Link>
              <span className="tools-hint">
                {" "}
                avoid {pct(h.avoidanceSatisfaction)} · keep{" "}
                {pct(h.preservationSatisfaction)} · you {pct(h.userFit)} ·{" "}
                {h.reasonSource}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tools-hint">
          Pick a title and optional reasons. Results keep what still works and
          change what you rejected.
        </p>
      )}
    </div>
  );
}
