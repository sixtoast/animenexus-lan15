"use client";

import { useState } from "react";

type Props = {
  videoId: string;
  title: string;
  thumbnail?: string | null;
};

/**
 * YouTube trailers load only after a click.
 * Avoids auto-embedding (which can trigger Google "automated requests" blocks)
 * and always offers Open on YouTube as a fallback.
 */
export function DetailTrailer({ videoId, title, thumbnail }: Props) {
  const [play, setPlay] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
  const thumb =
    thumbnail ||
    `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;

  return (
    <section className="detail-section">
      <h2>Trailer</h2>
      <div className="detail-trailer">
        {play ? (
          <iframe
            src={embedUrl}
            title={`${title} trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            className="detail-trailer-poster"
            onClick={() => setPlay(true)}
            aria-label={`Play trailer for ${title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" className="detail-trailer-thumb" />
            <span className="detail-trailer-play" aria-hidden>
              ▶
            </span>
            <span className="detail-trailer-hint">Play trailer</span>
          </button>
        )}
      </div>
      <p className="detail-trailer-fallback">
        <a href={watchUrl} target="_blank" rel="noreferrer">
          Open on YouTube ↗
        </a>
        <span className="tools-hint">
          {" "}
          · Use this if the embed is blocked on your network
        </span>
      </p>
    </section>
  );
}
