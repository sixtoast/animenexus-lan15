"use client";

import { useMemo } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import {
  buildCreativeConnections,
  type ShelfTitle,
} from "@/lib/creative-connections";
import type { CreativeDnaSlot } from "@/lib/creative-dna";

type Props = {
  dna: CreativeDnaSlot[];
  /** Current title id — excluded from “other titles” counts */
  currentId?: number;
};

export function CreativeConnectionsPanel({ dna, currentId }: Props) {
  const { entries, ready } = useWatchlist();

  const connections = useMemo(() => {
    if (!ready || !dna.length) return [];
    const shelf: ShelfTitle[] = entries
      .filter((e) => e.id !== currentId)
      .map((e) => ({
        id: e.id,
        title: e.title,
        score: e.score,
        studios: e.studios,
      }));
    return buildCreativeConnections({ dna, shelf });
  }, [ready, entries, dna, currentId]);

  if (!ready || !connections.length) return null;

  return (
    <section
      className="detail-section"
      aria-labelledby="creative-connections-heading"
    >
      <h2 id="creative-connections-heading">Creative connections</h2>
      <p className="tools-hint" style={{ marginBottom: 12 }}>
        Based on your shelf only — counts, not causation.
      </p>
      <ul className="theme-ul">
        {connections.map((c) => (
          <li key={`${c.kind}-${c.name}`}>
            {c.line}
            {c.examples.length ? (
              <span className="tools-hint">
                {" "}
                e.g. {c.examples.join(", ")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
