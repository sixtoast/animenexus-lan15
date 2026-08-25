"use client";

import { useState } from "react";
import type { DeepTag } from "@/lib/deep-metadata";
import { partitionDescriptors } from "@/lib/deep-tags";

type Props = {
  genres: string[];
  deepTags: DeepTag[];
  sourceNote?: string;
};

export function DeepSignalsPanel({ genres, deepTags, sourceNote }: Props) {
  const [open, setOpen] = useState(false);
  const { deepSignals: signals } = partitionDescriptors({
    anilistGenres: genres,
    deepTags,
  });

  if (!signals.length && !genres.length) return null;

  const preview = signals.slice(0, 6);
  const rest = signals.slice(6);

  return (
    <section className="detail-section" aria-labelledby="deep-signals-heading">
      <h2 id="deep-signals-heading">Why this feels like this</h2>
      <p className="tools-hint" style={{ marginBottom: 12 }}>
        Genres stay broad. Deep signals are niche descriptors
        {sourceNote ? ` (${sourceNote})` : ""}. Spoilers stay hidden.
      </p>

      {genres.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          <h3 className="theme-sub">Genres</h3>
          <div className="detail-tags">
            {genres.slice(0, 12).map((g) => (
              <span key={g} className="detail-tag">
                {g}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {preview.length > 0 ? (
        <div>
          <h3 className="theme-sub">Deep signals</h3>
          <ul className="theme-ul">
            {preview.map((t) => (
              <li key={`${t.source}-${t.name}`}>
                <strong>{t.name}</strong>
                {t.weight != null ? (
                  <span className="tools-hint"> · weight {t.weight}</span>
                ) : null}
                {t.description ? (
                  <span className="tools-hint"> — {t.description.slice(0, 120)}</span>
                ) : null}
              </li>
            ))}
          </ul>
          {rest.length > 0 ? (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
              >
                {open ? "Show less" : "Explore deeper"}
              </button>
              {open ? (
                <ul className="theme-ul" style={{ marginTop: 10 }}>
                  {rest.map((t) => (
                    <li key={`more-${t.source}-${t.name}`}>
                      <strong>{t.name}</strong>
                      {t.weight != null ? (
                        <span className="tools-hint"> · weight {t.weight}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <p className="tools-hint">
          No niche signals loaded for this title yet (AniDB id or client may be
          missing).
        </p>
      )}
    </section>
  );
}
