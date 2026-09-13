"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { useWatchlist } from "@/components/WatchlistProvider";
import { emitNexus } from "@/lib/nexus";
import { getBestAvailableFingerprint } from "@/lib/intelligence/items/resolve-fingerprint";
import {
  fuseFingerprints,
  fusionFit,
  normalizeRatio,
  parentBalanceScore,
} from "@/lib/intelligence/semantic-ops/fuse";
import { compareFingerprints } from "@/lib/intelligence/semantic-ops/compare";
import { retrieveAnimeCandidates } from "@/lib/intelligence/candidates/retrieve";

const W_HYBRID = 0.8;
const W_BALANCE = 0.12;
const W_QUALITY = 0.08;

type FusionHit = {
  anime: Anime;
  fusionFit: number;
  fitA: number;
  fitB: number;
  balance: number;
  finalScore: number;
  candidateSources: string[];
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function FusionClient() {
  const { entries } = useWatchlist();
  const [a, setA] = useState<Anime | null>(null);
  const [b, setB] = useState<Anime | null>(null);
  const [leanA, setLeanA] = useState(0.5);
  const [hits, setHits] = useState<FusionHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [poolSize, setPoolSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ratio = useMemo(() => normalizeRatio(leanA), [leanA]);

  useEffect(() => {
    emitNexus({ type: "tool_opened", tool: "fusion" });
  }, []);

  async function run() {
    if (!a || !b) return;
    setLoading(true);
    setHits([]);
    setPoolSize(0);
    setError(null);
    try {
      const ra = getBestAvailableFingerprint(a);
      const rb = getBestAvailableFingerprint(b);
      const fused = fuseFingerprints(ra.fingerprint, rb.fingerprint, leanA);

      const { candidates, uniqueCandidateCount } =
        await retrieveAnimeCandidates({
          intent: "fusion",
          seeds: [a, b],
          excludeIds: [a.id, b.id, ...entries.map((e) => e.id)],
          limit: 120,
        });
      setPoolSize(uniqueCandidateCount);

      const ranked: FusionHit[] = [];
      for (const rec of candidates.slice(0, 120)) {
        const anime = rec.anime;
        const rc = getBestAvailableFingerprint(anime);
        const fFit = fusionFit(
          rc.fingerprint,
          fused.target,
          fused.matchWeights,
        );
        const fitA = compareFingerprints(rc.fingerprint, ra.fingerprint)
          .similarity;
        const fitB = compareFingerprints(rc.fingerprint, rb.fingerprint)
          .similarity;
        const balance = parentBalanceScore(fitA, fitB, fused.ratio);
        const quality = anime.score > 0 ? Math.min(1, anime.score / 10) : 0.45;
        ranked.push({
          anime,
          fusionFit: fFit,
          fitA,
          fitB,
          balance,
          finalScore:
            fFit * W_HYBRID + balance * W_BALANCE + quality * W_QUALITY,
          candidateSources: rec.sources,
        });
      }
      ranked.sort((x, y) => y.finalScore - x.finalScore);
      setHits(ranked.slice(0, 16));
      if (!candidates.length) {
        setError(
          "No candidates returned — catalog APIs may be offline. Try again shortly.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fusion failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tools-panel">
      <div className="tools-pickers">
        <AnimeSearchPicker label="Parent A" selected={a} onSelect={setA} />
        <AnimeSearchPicker label="Parent B" selected={b} onSelect={setB} />
      </div>
      <label className="filter-label" style={{ display: "block", marginTop: 12 }}>
        Lean toward A ({Math.round(ratio.weightA * 100)}% /{" "}
        {Math.round(ratio.weightB * 100)}% B)
        <input
          type="range"
          min={0.2}
          max={0.8}
          step={0.05}
          value={leanA}
          onChange={(e) => setLeanA(Number(e.target.value))}
          style={{ width: "100%", maxWidth: 360 }}
        />
      </label>
      <div className="daily-actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-accent"
          disabled={!a || !b || loading}
          onClick={() => void run()}
        >
          {loading ? "Building hybrid…" : "Build hybrid"}
        </button>
      </div>
      <p className="tools-hint">
        Target = weighted A/B fingerprints. Rank = fusion fit ~80% + parent
        balance ~12% + quality ~8%. Genres only aid discovery.
      </p>
      {error ? (
        <p className="tools-hint" role="alert">
          {error}
        </p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="tools-results" style={{ marginTop: 16 }}>
          {hits.map((h) => (
            <li key={h.anime.id}>
              <Link href={`/anime/${h.anime.id}`}>{h.anime.title}</Link>
              <span className="tools-hint">
                {" "}
                hybrid {pct(h.fusionFit)} · A {pct(h.fitA)} · B {pct(h.fitB)} ·
                bal {pct(h.balance)}
              </span>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="tools-hint">
          {a && b
            ? poolSize === 0
              ? "No hybrid candidates yet — press Build hybrid again or check API status."
              : "Pick two parents and build a hybrid target."
            : "Pick two parents and build a hybrid target."}
        </p>
      ) : null}
    </div>
  );
}
