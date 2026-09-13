"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { useWatchlist } from "@/components/WatchlistProvider";
import { emitNexus } from "@/lib/nexus";
import { getBestAvailableFingerprint } from "@/lib/intelligence/items/resolve-fingerprint";
import {
  compareFingerprints,
  fitToUserVector,
  type CompareResult,
} from "@/lib/intelligence/semantic-ops/compare";
import {
  blendUserVector,
  buildUserPreferenceVector,
} from "@/lib/intelligence/preference/user-preference-vector";

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function dimLabel(key: string) {
  const leaf = key.includes(".") ? key.split(".").pop()! : key;
  return leaf.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

export function CompareClient() {
  const { entries, ready } = useWatchlist();
  const [a, setA] = useState<Anime | null>(null);
  const [b, setB] = useState<Anime | null>(null);

  useEffect(() => {
    emitNexus({ type: "tool_opened", tool: "compare" });
  }, []);

  const userVec = useMemo(() => {
    if (!ready || entries.length < 2) return null;
    try {
      const user = buildUserPreferenceVector(entries);
      return blendUserVector(user, {
        stable: 0.7,
        mediumTerm: 0.2,
        recent: 0.1,
        session: 0,
      });
    } catch {
      return null;
    }
  }, [ready, entries]);

  const result: CompareResult | null = useMemo(() => {
    if (!a || !b) return null;
    const ra = getBestAvailableFingerprint(a);
    const rb = getBestAvailableFingerprint(b);
    return compareFingerprints(ra.fingerprint, rb.fingerprint, {
      animeA: a,
      animeB: b,
      sourceA: ra.source,
      sourceB: rb.source,
      nexusIdA: ra.nexusId,
      nexusIdB: rb.nexusId,
    });
  }, [a, b]);

  const userFit = useMemo(() => {
    if (!userVec || !a || !b) return null;
    const ra = getBestAvailableFingerprint(a);
    const rb = getBestAvailableFingerprint(b);
    return {
      a: fitToUserVector(ra.fingerprint, userVec),
      b: fitToUserVector(rb.fingerprint, userVec),
    };
  }, [userVec, a, b]);

  return (
    <div className="tools-panel">
      <div className="tools-pickers">
        <AnimeSearchPicker label="Title A" selected={a} onSelect={setA} />
        <AnimeSearchPicker label="Title B" selected={b} onSelect={setB} />
      </div>

      {a && b && result ? (
        <div className="compare-semantic">
          <div className="compare-grid">
            {[a, b].map((x, i) => (
              <div key={x.id} className="compare-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.image} alt="" />
                <Link href={`/anime/${x.id}`} className="compare-title">
                  {i === 0 ? "A · " : "B · "}
                  {x.title}
                </Link>
                <ul className="compare-stats">
                  <li>
                    <span>Score</span>
                    <strong>{x.score > 0 ? x.score.toFixed(1) : "—"}</strong>
                  </li>
                  <li>
                    <span>Format</span>
                    <strong>{x.format}</strong>
                  </li>
                  <li>
                    <span>Year</span>
                    <strong>{x.year || "—"}</strong>
                  </li>
                </ul>
                {userFit ? (
                  <p className="tools-hint">
                    Shelf fit {i === 0 ? pct(userFit.a) : pct(userFit.b)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <section className="compare-block" style={{ marginTop: 16 }}>
            <h3>Semantic similarity</h3>
            <p className="tools-hint">
              Weighted fingerprint distance across emotional, narrative,
              experience, and style — not genre overlap.
            </p>
            <p className="compare-similarity">
              <strong>{pct(result.similarity)}</strong>
              <span className="tools-hint">
                {" "}
                · fp {result.fingerprintSourceA} / {result.fingerprintSourceB}
                {" "}
                · conf {pct(result.confidenceA)} / {pct(result.confidenceB)}
              </span>
            </p>
          </section>

          {result.largestDifferences.length > 0 ? (
            <section className="compare-block">
              <h3>Largest differences</h3>
              <ul>
                {result.largestDifferences.slice(0, 6).map((d) => (
                  <li key={d.key}>
                    <strong>{dimLabel(d.key)}</strong>: A {d.a.toFixed(2)} vs B{" "}
                    {d.b.toFixed(2)} (Δ {d.absoluteDifference.toFixed(2)})
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="tools-hint">No high-confidence dimension gaps.</p>
          )}

          {result.sharedTraits.length > 0 ? (
            <section className="compare-block">
              <h3>Strongest shared traits</h3>
              <ul>
                {result.sharedTraits.slice(0, 6).map((t) => (
                  <li key={t.key}>
                    Both {t.direction === "high" ? "high" : "low"} on{" "}
                    <strong>{dimLabel(t.key)}</strong> (A {t.a.toFixed(2)}, B{" "}
                    {t.b.toFixed(2)})
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="tools-hint">No high-confidence shared semantic peaks.</p>
          )}

          {result.supporting.sharedGenres.length > 0 ? (
            <section className="compare-block">
              <h3>Genre overlap (supporting only)</h3>
              <p className="tools-hint">
                {result.supporting.sharedGenres.join(" · ")}
              </p>
            </section>
          ) : null}

          {userFit ? (
            <p className="tools-hint" style={{ marginTop: 12 }}>
              {userFit.a >= userFit.b + 0.04
                ? "Better match for you right now: A"
                : userFit.b >= userFit.a + 0.04
                  ? "Better match for you right now: B"
                  : "Both fit your shelf similarly"}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="tools-hint">Pick two titles to compare fingerprints.</p>
      )}
    </div>
  );
}
