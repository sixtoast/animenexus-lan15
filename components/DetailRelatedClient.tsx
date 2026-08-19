"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import type { AnimeRelation } from "@/lib/types";

type Props = {
  relations: AnimeRelation[];
  centerTitle: string;
};

const OFFICIAL = new Set([
  "SEQUEL",
  "PREQUEL",
  "PARENT",
  "SIDE_STORY",
  "SPIN_OFF",
  "ALTERNATIVE",
  "SUMMARY",
  "CHARACTER",
  "OTHER",
]);

function officialRank(type: string): number {
  const order = [
    "SEQUEL",
    "PREQUEL",
    "PARENT",
    "SIDE_STORY",
    "SPIN_OFF",
    "ALTERNATIVE",
    "SUMMARY",
    "CHARACTER",
    "OTHER",
  ];
  const i = order.indexOf(type.toUpperCase());
  return i >= 0 ? i : 50;
}

/**
 * Official franchise links stay first (story order).
 * RECOMMENDED items soft-rank: not-on-shelf first, then community score.
 */
export function DetailRelatedClient({ relations, centerTitle }: Props) {
  const { entries, ready } = useWatchlist();

  const ordered = useMemo(() => {
    if (!relations.length) return [];
    const onShelf = new Set(entries.map((e) => e.id));

    const official = relations
      .filter((r) => OFFICIAL.has((r.relationType || "").toUpperCase()))
      .sort(
        (a, b) =>
          officialRank(a.relationType) - officialRank(b.relationType) ||
          (b.score || 0) - (a.score || 0),
      );

    const recommended = relations
      .filter((r) => !OFFICIAL.has((r.relationType || "").toUpperCase()))
      .map((r) => {
        const shelfPenalty = onShelf.has(r.id) ? 0.25 : 0;
        const community = r.score && r.score > 0 ? r.score / 10 : 0.4;
        return { r, score: community - shelfPenalty };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.r);

    // Deduplicate while preserving order
    const seen = new Set<number>();
    const out: AnimeRelation[] = [];
    for (const r of [...official, ...recommended]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [relations, entries]);

  if (!ordered.length) return null;

  const personalized = ready && entries.length >= 1;

  return (
    <section className="detail-section">
      <h2>Related & recommended</h2>
      {personalized ? (
        <p className="tools-hint" role="status" aria-live="polite">
          Official links first; recommendations soft-ranked for your shelf around{" "}
          {centerTitle}.
        </p>
      ) : (
        <p className="tools-hint">Official franchise links, then catalog picks.</p>
      )}
      <div className="home-rail" style={{ marginTop: 12 }}>
        {ordered.slice(0, 16).map((r) => (
          <Link
            key={`${r.relationType}-${r.id}`}
            href={`/anime/${r.id}`}
            className="home-rail-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                r.image ||
                "https://placehold.co/120x170/1a1a1a/555?text=?"
              }
              alt=""
            />
            <div className="hrc-body">
              <div className="hrc-title">{r.title}</div>
              <div className="hrc-meta">
                {(r.relationType || "RELATED").replace(/_/g, " ")}
                {r.score ? ` · ★ ${r.score.toFixed(1)}` : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
