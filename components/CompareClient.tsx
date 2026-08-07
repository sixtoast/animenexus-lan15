"use client";

import Link from "next/link";
import { useState } from "react";
import type { Anime } from "@/lib/types";
import { AnimeSearchPicker } from "@/components/AnimeSearchPicker";
import { sharedTags } from "@/lib/tools";

export function CompareClient() {
  const [a, setA] = useState<Anime | null>(null);
  const [b, setB] = useState<Anime | null>(null);

  const shared = a && b ? sharedTags(a, b) : [];

  return (
    <div className="tools-panel">
      <div className="tools-pickers">
        <AnimeSearchPicker label="Title A" selected={a} onSelect={setA} />
        <AnimeSearchPicker label="Title B" selected={b} onSelect={setB} />
      </div>

      {a && b ? (
        <div className="compare-grid">
          {[a, b].map((x) => (
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
    </div>
  );
}
