"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOODS } from "@/lib/moods";

type Props = {
  active?: string;
  className?: string;
};

export function MoodChips({ active, className }: Props) {
  const pathname = usePathname();
  const current =
    active ||
    (pathname.startsWith("/mood/") ? pathname.split("/")[2] : undefined);

  return (
    <div className={"mood-chips" + (className ? ` ${className}` : "")}>
      {MOODS.map((m) => {
        const isActive = current === m.slug;
        return (
          <Link
            key={m.slug}
            href={`/mood/${m.slug}`}
            className={"mood-chip" + (isActive ? " active" : "")}
            title={m.blurb}
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
