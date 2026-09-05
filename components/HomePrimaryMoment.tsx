"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useWatchlist } from "@/components/WatchlistProvider";
import { chooseHomePrimary } from "@/lib/home-priority";
import { readIntentSession } from "@/lib/intent-session";
import { useSessionRevision } from "@/lib/use-session-revision";
import type { Anime } from "@/lib/types";

type Props = {
  candidates: Anime[];
};

export function HomePrimaryMoment({ candidates }: Props) {
  const { entries, ready } = useWatchlist();
  const rev = useSessionRevision();

  const primary = useMemo(() => {
    if (!ready) {
      return {
        type: "empty" as const,
        title: "Loading your desk…",
        subtitle: "",
        reason: "",
        href: "/browse",
        cta: "…",
      };
    }
    return chooseHomePrimary(entries, candidates, {
      experienceSlug: readIntentSession().slug || undefined,
    });
  }, [ready, entries, candidates, rev]);

  return (
    <section
      className="home-primary"
      data-mascot-landmark="hero"
      data-mascot-id="home-primary"
      data-mascot-priority="1"
      aria-label="Primary recommendation"
    >
      <p className="home-primary-kicker">
        {primary.type === "continue"
          ? "Continue"
          : primary.type === "tonight_pick"
            ? "Lantern’s pick"
            : primary.type === "taste_signal"
              ? "Signal"
              : "Desk"}
      </p>
      <div className="home-primary-row">
        {primary.anime?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="home-primary-art"
            src={primary.anime.image}
            alt=""
            width={96}
            height={136}
          />
        ) : null}
        <div className="home-primary-copy">
          <h2 className="home-primary-title">{primary.title}</h2>
          {primary.subtitle ? (
            <p className="home-primary-sub">{primary.subtitle}</p>
          ) : null}
          {primary.reason ? (
            <p className="home-primary-reason">{primary.reason}</p>
          ) : null}
          <Link href={primary.href} className="btn btn-accent home-primary-cta">
            {primary.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
