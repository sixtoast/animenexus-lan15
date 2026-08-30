"use client";

import Link from "next/link";
import { MOODS } from "@/lib/moods";
import { writeIntentSession } from "@/lib/intent-session";

type Props = {
  active?: string;
  className?: string;
};

export function MoodChips({ active, className }: Props) {
  return (
    <div className={"mood-chips" + (className ? ` ${className}` : "")}>
      {MOODS.map((m) => {
        const isActive = active === m.slug;
        return (
          <Link
            key={m.slug}
            href={`/mood/${m.slug}`}
            className={"mood-chip" + (isActive ? " active" : "")}
            title={m.blurb}
            aria-current={isActive ? "page" : undefined}
            onClick={() => writeIntentSession({ slug: m.slug })}
          >
            <span className="mood-emoji" aria-hidden>
              {m.emoji}
            </span>
            <span>{m.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
