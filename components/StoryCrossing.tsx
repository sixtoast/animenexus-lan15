"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Anime } from "@/lib/types";

type Crossing = { left: Anime; right: Anime; thread: string; contrast: string };

function cleanTags(anime: Anime) {
  return [...new Set([...(anime.tags ?? []), ...(anime.genre ? anime.genre.split(/[,/|]/) : [])]
    .map((value) => value.trim())
    .filter(Boolean))];
}

function buildCrossings(candidates: Anime[]): Crossing[] {
  const source = candidates.filter((anime) => anime.image && anime.title);
  const crossings: Array<Crossing & { score: number; key: string }> = [];

  for (let i = 0; i < source.length; i += 1) {
    for (let j = i + 1; j < source.length; j += 1) {
      const left = source[i];
      const right = source[j];
      if (left.id === right.id) continue;

      const leftTags = cleanTags(left);
      const rightTags = cleanTags(right);
      const shared = leftTags.filter((tag) =>
        rightTags.some((other) => other.toLowerCase() === tag.toLowerCase()),
      );
      const leftGenre = (left.genre || "").split(/[,/|]/)[0]?.trim();
      const rightGenre = (right.genre || "").split(/[,/|]/)[0]?.trim();
      const contrast = leftGenre && rightGenre && leftGenre.toLowerCase() !== rightGenre.toLowerCase()
        ? `${leftGenre} meets ${rightGenre}`
        : "A familiar thread, a different world";

      if (!shared.length) continue;
      const thread = shared[0];
      const score = (leftGenre && rightGenre && leftGenre.toLowerCase() !== rightGenre.toLowerCase() ? 100 : 0)
        + (shared.length === 1 ? 18 : Math.max(0, 12 - shared.length * 2))
        + Math.min(10, Math.abs((left.score || 0) - (right.score || 0)) / 5);
      crossings.push({ left, right, thread, contrast, score, key: `${left.id}-${right.id}` });
    }
  }

  return crossings
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, 24)
    .map(({ left, right, thread, contrast }) => ({ left, right, thread, contrast }));
}

export function StoryCrossing({ candidates }: { candidates: Anime[] }) {
  const crossings = useMemo(() => buildCrossings(candidates), [candidates]);
  const [activeIndex, setActiveIndex] = useState(0);
  const crossing = crossings.length ? crossings[activeIndex % crossings.length] : null;

  if (!crossing) return null;

  return (
    <section className="story-crossing" aria-labelledby="story-crossing-title">
      <div className="story-crossing-head">
        <span className="story-crossing-index">05 / THE CROSSING</span>
        <p>Good recommendations don’t always look alike.</p>
      </div>
      <div className="story-crossing-stage">
        <div className="story-crossing-intro">
          <h2 id="story-crossing-title">Two worlds.<br /><em>One hidden thread.</em></h2>
          <p>Find the unexpected link between stories that seem to belong in different universes.</p>
          <button
            className="story-crossing-next"
            type="button"
            onClick={() => setActiveIndex((index) => (index + 1) % crossings.length)}
            disabled={crossings.length < 2}
          >
            Find another crossing <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="story-crossing-pair" aria-live="polite">
          <Link href={`/anime/${crossing.left.id}`} className="story-crossing-art story-crossing-art--left">
            <img src={crossing.left.image} alt="" loading="lazy" />
            <span className="story-crossing-number">A / 01</span>
            <span className="story-crossing-title">{crossing.left.title}</span>
          </Link>
          <div className="story-crossing-thread">
            <span className="story-crossing-thread-line" aria-hidden="true" />
            <span className="story-crossing-thread-label">SHARED DNA</span>
            <strong>{crossing.thread}</strong>
            <small>{crossing.contrast}</small>
            <span className="story-crossing-thread-line" aria-hidden="true" />
          </div>
          <Link href={`/anime/${crossing.right.id}`} className="story-crossing-art story-crossing-art--right">
            <img src={crossing.right.image} alt="" loading="lazy" />
            <span className="story-crossing-number">B / 02</span>
            <span className="story-crossing-title">{crossing.right.title}</span>
          </Link>
        </div>
        <div className="story-crossing-footer">
          <span>CONNECTION FOUND IN CATALOGUE TAGS</span>
          <span>{String((activeIndex % crossings.length) + 1).padStart(2, "0")} / {String(crossings.length).padStart(2, "0")}</span>
        </div>
      </div>
    </section>
  );
}
