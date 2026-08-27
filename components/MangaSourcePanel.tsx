"use client";

import Link from "next/link";
import type { MangaSourceLink } from "@/lib/manga-types";

type Props = {
  links: MangaSourceLink[];
};

export function MangaSourcePanel({ links }: Props) {
  if (!links.length) return null;

  return (
    <section className="detail-section" aria-labelledby="manga-source-heading">
      <h2 id="manga-source-heading">Manga source</h2>
      <p className="tools-hint" style={{ marginBottom: 12 }}>
        Linked source / adaptation media from relations. Anime stays the primary
        catalog — this is context only.
      </p>
      <ul className="theme-ul">
        {links.map(({ relationType, manga }) => (
          <li key={`${manga.id}-${relationType}`}>
            <strong>{manga.title}</strong>
            <span className="tools-hint">
              {" "}
              · {relationType.replace(/_/g, " ")}
              {manga.format ? ` · ${manga.format}` : ""}
              {manga.chapters != null ? ` · ${manga.chapters} ch` : ""}
              {manga.volumes != null ? ` · ${manga.volumes} vol` : ""}
              {manga.score != null ? ` · ★ ${manga.score.toFixed(1)}` : ""}
              {` · via ${manga.source}`}
            </span>
            {manga.url ? (
              <>
                {" "}
                <a href={manga.url} target="_blank" rel="noreferrer">
                  Open ↗
                </a>
              </>
            ) : null}
            {manga.malId ? (
              <>
                {" "}
                <a
                  href={`https://myanimelist.net/manga/${manga.malId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  MAL ↗
                </a>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="tools-hint" style={{ marginTop: 8 }}>
        Full manga browse is out of scope for this sprint — identity + depth on
        anime first.{" "}
        <Link href="/browse">Browse anime →</Link>
      </p>
    </section>
  );
}
