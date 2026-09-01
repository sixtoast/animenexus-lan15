"use client";

import Link from "next/link";
import { EXPERIENCE_INTENTS } from "@/lib/viewing-intent";
import { writeIntentSession } from "@/lib/intent-session";
import { playCue } from "@/lib/sound-engine";

/** Experiential packs — steers browse/ranker without genre-only thinking. */
export function ExperiencePackStrip() {
  const packs = EXPERIENCE_INTENTS.slice(0, 8);

  return (
    <section className="exp-pack-strip" aria-label="Experience packs">
      <div className="home-rail-head">
        <h2>How should tonight feel?</h2>
        <span className="home-rail-note">Intent · not genres</span>
      </div>
      <div className="exp-pack-row">
        {packs.map((p) => (
          <Link
            key={p.slug}
            href={`/browse?experience=${encodeURIComponent(p.slug)}`}
            className="exp-pack-chip"
            title={p.blurb}
            onClick={() => {
              writeIntentSession({ slug: p.slug });
              playCue("filter_select");
            }}
          >
            <span className="exp-pack-emoji" aria-hidden>
              {p.emoji}
            </span>
            <span className="exp-pack-label">{p.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
