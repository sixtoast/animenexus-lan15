/**
 * Episode list UI (Multi-API Sprint 9).
 * Titles only when provided by provider — never invent names.
 */

import type { AnimeEpisode } from "@/lib/enrichment-types";

type Props = {
  episodes: AnimeEpisode[];
  max?: number;
  sourceNote?: string;
};

export function EpisodeList({ episodes, max = 40, sourceNote }: Props) {
  if (!episodes.length) return null;
  const shown = episodes.slice(0, max);

  return (
    <section className="detail-section" id="episodes">
      <h2>Episodes</h2>
      {sourceNote ? (
        <p className="tools-hint" style={{ marginBottom: 10 }}>
          {sourceNote}
        </p>
      ) : null}
      <ol className="episode-list">
        {shown.map((ep) => (
          <li key={ep.number} className="episode-row">
            <span className="episode-num">Ep {ep.number}</span>
            <span className="episode-title">
              {ep.title?.trim() ? ep.title : `Episode ${ep.number}`}
            </span>
            {ep.duration ? (
              <span className="episode-meta">{ep.duration} min</span>
            ) : null}
            {ep.airedAt ? (
              <span className="episode-meta">{ep.airedAt.slice(0, 10)}</span>
            ) : null}
          </li>
        ))}
      </ol>
      {episodes.length > max ? (
        <p className="tools-hint">
          Showing first {max} of {episodes.length}.
        </p>
      ) : null}
    </section>
  );
}
