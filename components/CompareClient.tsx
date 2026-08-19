"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { sharedTags } from "@/lib/tools";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  cosineSimilarity,
  resonanceFromGenres,
  userResonance,
} from "@/lib/resonance";
import { emitNexus } from "@/lib/nexus";

function shelfFitLabel(sim: number): string {
  if (sim >= 0.55) return "Strong shelf fit";
  if (sim >= 0.35) return "Soft shelf fit";
  if (sim >= 0.18) return "Exploratory vs shelf";
  return "Outside current shelf";
}

export function CompareClient() {
  const { entries, ready } = useWatchlist();
  const [a, setA] = useState<Anime | null>(null);
  const [b, setB] = useState<Anime | null>(null);

  const shared = a && b ? sharedTags(a, b) : [];
  const user = useMemo(() => userResonance(entries), [entries]);

  useEffect(() => {
    emitNexus({ type: "tool_opened", tool: "compare" });
  }, []);

  const fits = useMemo(() => {
    if (!ready || entries.length < 2) return null;
    return {
      a: a ? cosineSimilarity(user, resonanceFromGenres(a.tags)) : 0,
      b: b ? cosineSimilarity(user, resonanceFromGenres(b.tags)) : 0,
    };
  }, [ready, entries.length, user, a, b]);

  return (
    <div className="tools-panel">
      <div className="tools-pickers">
        <AnimeSearchPicker label="Title A" selected={a} onSelect={setA} />
        <AnimeSearchPicker label="Title B" selected={b} onSelect={setB} />
      </div>

      {a && b ? (
        <div className="compare-grid">
          {[a, b].map((x, i) => (
            <div key={x.id} className="compare-col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.image} alt="" />
              <Link href={`/anime/${x.id}`} className="compare-title">
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
                <li>
                  <span>Episodes</span>
                  <strong>{x.episodes}</strong>
                </li>
                <li>
                  <span>Status</span>
                  <strong>{x.status}</strong>
                </li>
                {fits ? (
                  <li>
                    <span>Your shelf</span>
                    <strong>
                      {shelfFitLabel(i === 0 ? fits.a : fits.b)}
                    </strong>
                  </li>
                ) : null}
              </ul>
              <div className="compare-tags">
                {x.tags.slice(0, 8).map((t) => (
                  <span
                    key={t}
                    className={
                      "taste-chip" +
                      (shared.some((s) => s.toLowerCase() === t.toLowerCase())
                        ? " shared"
                        : "")
                    }
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="tools-hint">
          Pick two titles to put them on the same desk.
        </p>
      )}

      {shared.length > 0 ? (
        <p className="tools-shared">
          Shared genres: <strong>{shared.join(", ")}</strong>
        </p>
      ) : null}

      {fits && a && b ? (
        <p className="tools-hint" role="status" aria-live="polite">
          Soft shelf labels only — no fabricated precision scores.
        </p>
      ) : null}
    </div>
  );
}
