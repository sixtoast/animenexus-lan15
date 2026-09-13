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

  const ratio = useMemo(() => normalizeRatio(leanA), [leanA]);

  useEffect(() => {
    emitNexus({ type: "tool_opened", tool: "fusion" });
  }, []);

  async function run() {
    if (!a || !b) return;
    setLoading(true);
    setHits([]);
    try {
      const ra = getBestAvailableFingerprint(a);
      const rb = getBestAvailableFingerprint(b);
      const fused = fuseFingerprints(ra.fingerprint, rb.fingerprint, leanA);

      const pools: Anime[] = [];
      const seen = new Set<number>([a.id, b.id, ...entries.map((e) => e.id)]);

      async function pull(url: string) {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const j = await res.json();
          for (const x of (j.data || j.media || []) as Anime[]) {
            if (!x?.id || seen.has(x.id)) continue;
            seen.add(x.id);
            pools.push(x);
          }
        } catch {
          /* isolate */
        }
      }

      const tags = [...new Set([...(a.tags || []), ...(b.tags || [])])].slice(0, 4);
      await Promise.all([
        tags.length
          ? pull(`/api/recommend?mode=popular&genres=${encodeURIComponent(tags.join(","))}`)
          : Promise.resolve(),
        pull(`/api/recommend?mode=popular`),
        pull(`/api/recommend?mode=score`),
      ]);

      const ranked: FusionHit[] = [];
      for (const anime of pools.slice(0, 120)) {
        const rc = getBestAvailableFingerprint(anime);
        const fFit = fusionFit(rc.fingerprint, fused.target, fused.matchWeights);
        const fitA = compareFingerprints(rc.fingerprint, ra.fingerprint).similarity;
        const fitB = compareFingerprints(rc.fingerprint, rb.fingerprint).similarity;
        const balance = parentBalanceScore(fitA, fitB, fused.ratio);
        const quality = anime.score > 0 ? Math.min(1, anime.score / 10) : 0.45;
        ranked.push({
          anime,
          fusionFit: fFit,
          fitA,
          fitB,
          balance,
          finalScore: fFit * W_HYBRID + balance * W_BALANCE + quality * W_QUALITY,
        });
      }
      ranked.sort((x, y) => y.finalScore - x.finalScore);
      setHits(ranked.slice(0, 16));
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
        Lean toward A ({Math.round(ratio.weightA * 100)}% / {Math.round(ratio.weightB * 100)}% B)
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
        Target fingerprint = weighted average of A and B (not LLM). Rank =
        fusion fit ~80% + parent balance ~12% + quality ~8%. Genres only aid discovery.
      </p>
      {hits.length > 0 ? (
        <ul className="tools-results" style={{ marginTop: 16 }}>
          {hits.map((h) => (
            <li key={h.anime.id}>
              <Link href={`/anime/${h.anime.id}`}>{h.anime.title}</Link>
              <span className="tools-hint">
                {" "}
                hybrid {pct(h.fusionFit)} · A {pct(h.fitA)} · B {pct(h.fitB)} · bal {pct(h.balance)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tools-hint">Pick two parents and build a hybrid target.</p>
      )}
    </div>
  );
}
