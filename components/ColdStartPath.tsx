"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { readMemory } from "@/lib/lantern-memory";
import { readIntentSession } from "@/lib/intent-session";
import { playCue } from "@/lib/sound-engine";

const DISMISS_KEY = "anime_nexus_cold_start_path_dismissed";

type Step = {
  id: string;
  label: string;
  done: boolean;
  href: string;
  cta: string;
  hint: string;
};

/**
 * Progressive cold-start path for empty / thin shelves.
 * Soft-fail: hides once dismissed or shelf is established.
 */
export function ColdStartPath() {
  const { entries, ready } = useWatchlist();
  const [open, setOpen] = useState(false);

  const steps: Step[] = useMemo(() => {
    if (!ready) return [];
    const views = readMemory().recentViews?.length || 0;
    const hasIntent = !!readIntentSession().slug;
    const shelf = entries.length;

    return [
      {
        id: "mood",
        label: "Pick a mood or tonight intent",
        done: hasIntent,
        href: "/mood",
        cta: "Moods",
        hint: "Tells Lantern what kind of night you want.",
      },
      {
        id: "seal",
        label: "Seal 3 titles you care about",
        done: shelf >= 3,
        href: "/browse?feed=trending",
        cta: "Discover",
        hint: "Watchlist stays in this browser — that’s the signal.",
      },
      {
        id: "open",
        label: "Open a few detail pages",
        done: views >= 3,
        href: "/browse?feed=popular",
        cta: "Browse",
        hint: "Views teach resonance without a questionnaire.",
      },
    ];
  }, [ready, entries]);

  const doneCount = steps.filter((s) => s.done).length;
  const established = entries.length >= 8;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") {
      setOpen(false);
      return;
    }
    if (!ready || established) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [ready, established]);

  if (!open || !steps.length) return null;

  return (
    <section
      className="cold-start-path"
      aria-label="Getting started with Lantern"
    >
      <div className="cold-start-path-head">
        <div>
          <p className="cold-start-path-kicker">First light</p>
          <h2 className="cold-start-path-title">
            {doneCount === 0
              ? "Three quiet steps to a living desk"
              : doneCount >= 3
                ? "Signal is forming"
                : `${doneCount} of 3 — keep going`}
          </h2>
          <p className="cold-start-path-lead">
            No account required. Lantern learns from what you seal and open —
            not from a long survey.
          </p>
        </div>
        <button
          type="button"
          className="cold-start-path-dismiss"
          aria-label="Dismiss getting started"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            playCue("filter_select");
            setOpen(false);
          }}
        >
          ×
        </button>
      </div>
      <ol className="cold-start-path-steps">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={
              "cold-start-path-step" + (s.done ? " is-done" : "")
            }
          >
            <span className="cold-start-path-num" aria-hidden>
              {s.done ? "✓" : i + 1}
            </span>
            <div className="cold-start-path-step-body">
              <div className="cold-start-path-step-label">{s.label}</div>
              <p className="cold-start-path-step-hint">{s.hint}</p>
              {!s.done ? (
                <Link
                  href={s.href}
                  className="btn btn-outline btn-sm"
                  onClick={() => playCue("filter_select")}
                >
                  {s.cta}
                </Link>
              ) : (
                <span className="meta">Done</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
