"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWatchlist } from "@/components/WatchlistProvider";
import { WatchlistToolbar } from "@/components/WatchlistToolbar";
import { WatchlistPresentationToggle } from "@/components/WatchlistPresentationToggle";
import { LivingShelf } from "@/components/living-shelf/LivingShelf";
import {
  WatchlistShelfEmpty,
  WatchlistTabEmpty,
} from "@/components/WatchlistEmptyStates";
import { AnimeImage } from "@/components/AnimeImage";
import { SignalBars } from "@/components/ui/SignalBars";
import type { WatchStatus, WatchlistEntry } from "@/lib/types";
import { WATCH_STATUS_TABS } from "@/lib/watchlist-storage";
import {
  cosineSimilarity,
  interactionWeight,
  resonanceFromGenres,
  userResonance,
} from "@/lib/resonance";
import {
  readWatchlistPresentation,
  type WatchlistPresentation,
} from "@/lib/living-shelf";
import {
  getAnimeObjectId,
  getAnimeViewTransitionName,
  withViewTransition,
} from "@/lib/view-transition";
import { playCue } from "@/lib/sound-engine";

type SortMode = "recent" | "signal" | "progress";

function episodeCount(e: WatchlistEntry): number {
  const n =
    typeof e.episodes === "number"
      ? e.episodes
      : parseInt(String(e.episodes || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

export function WatchlistClient() {
  const router = useRouter();
  const {
    entries,
    ready,
    remove,
    setStatus,
    setProgress,
    setUserRating,
    clearAll,
  } = useWatchlist();
  const [tab, setTab] = useState<WatchStatus | "all">("all");
  const [sort, setSort] = useState<SortMode>("recent");
  const [presentation, setPresentation] =
    useState<WatchlistPresentation>("manage");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  useEffect(() => {
    setPresentation(readWatchlistPresentation());
  }, []);

  const user = useMemo(() => userResonance(entries), [entries]);

  const filtered = useMemo(() => {
    const base =
      tab === "all" ? [...entries] : entries.filter((e) => e.watchStatus === tab);

    if (sort === "recent") {
      return base;
    }

    if (sort === "progress") {
      return base.sort((a, b) => {
        const pa = (a.progress || 0) / episodeCount(a);
        const pb = (b.progress || 0) / episodeCount(b);
        return pb - pa || (b.progress || 0) - (a.progress || 0);
      });
    }

    return base
      .map((e) => {
        const w = interactionWeight(e);
        const sim = cosineSimilarity(user, resonanceFromGenres(e.genres));
        return { e, s: 0.5 * w + 0.5 * sim };
      })
      .sort((a, b) => b.s - a.s)
      .map((x) => x.e);
  }, [entries, tab, sort, user]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    for (const e of entries) {
      c[e.watchStatus] = (c[e.watchStatus] || 0) + 1;
    }
    return c;
  }, [entries]);

  function onStatus(id: number, next: WatchStatus, prev: WatchStatus) {
    setStatus(id, next);
    setFlashId(id);
    window.setTimeout(() => setFlashId(null), 400);
    if (prev === "planning" && next === "watching") {
      playCue("seal");
    } else if (next === "completed") {
      playCue("complete");
    } else {
      playCue("filter_select");
    }
  }

  function onProgress(id: number, next: number, prev: number, maxEp: number) {
    setProgress(id, next);
    if (next > prev) playCue("progress_up");
    else if (next < prev) playCue("progress_down");
    if (maxEp > 0 && next >= maxEp) {
      playCue("complete");
    }
  }

  function onRemove(id: number) {
    setRemovingId(id);
    window.setTimeout(() => {
      remove(id);
      setRemovingId(null);
      playCue("remove");
    }, 220);
  }

  if (!ready) {
    return (
      <div className="state-box">
        <SignalBars level={3} animated />
        <p style={{ marginTop: 12 }}>Lantern is opening your shelf…</p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="wl-presentation-bar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <WatchlistPresentationToggle
          value={presentation}
          onChange={setPresentation}
        />
        {presentation === "shelf" ? (
          <p className="tools-hint" style={{ margin: 0 }}>
            Spatial shelf — orbit, zoom, inspect. Switch to Manage anytime.
          </p>
        ) : null}
      </div>

      {presentation === "shelf" ? <LivingShelf entries={entries} /> : null}

      {presentation === "manage" ? (
        <>
          <div className="feed-tabs" role="tablist" aria-label="Watchlist status">
            {WATCH_STATUS_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                className={"feed-tab" + (tab === t.value ? " active" : "")}
                onClick={() => setTab(t.value)}
              >
                {t.label}
                <span className="wl-count">{counts[t.value] || 0}</span>
              </button>
            ))}
          </div>

          {entries.length > 0 ? (
            <div
              className="daily-actions"
              style={{ marginBottom: 12, flexWrap: "wrap" }}
              role="group"
              aria-label="Watchlist sort"
            >
              {(
                [
                  ["recent", "Recent"],
                  ["signal", "Shelf signal"],
                  ["progress", "Progress"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={
                    "btn btn-sm " +
                    (sort === id ? "btn-accent" : "btn-outline")
                  }
                  aria-pressed={sort === id}
                  onClick={() => setSort(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <WatchlistToolbar />

          {entries.length === 0 ? (
            <WatchlistShelfEmpty />
          ) : filtered.length === 0 ? (
            <WatchlistTabEmpty tab={tab} />
          ) : (
            <>
              {sort !== "recent" ? (
                <p className="tools-hint" role="status" aria-live="polite">
                  {sort === "signal"
                    ? "Ordered by engagement + resonance vs your shelf — soft ranks."
                    : "Ordered by episode progress toward finishing."}
                </p>
              ) : null}
              <ul className="wl-list">
                {filtered.map((e) => {
                  const maxEp =
                    typeof e.episodes === "number" ? e.episodes : undefined;
                  const cap = episodeCount(e);
                  const pct = Math.min(
                    100,
                    Math.round(((e.progress || 0) / cap) * 100),
                  );
                  const vt = getAnimeViewTransitionName(e.id);
                  const href = `/anime/${e.id}`;
                  return (
                    <li
                      key={e.id}
                      className={
                        "wl-row" +
                        (removingId === e.id ? " wl-row--out" : "") +
                        (flashId === e.id ? " wl-row--flash" : "") +
                        ` wl-row--${e.watchStatus}`
                      }
                      data-anime-object-id={getAnimeObjectId(e.id)}
                      data-status={e.watchStatus}
                    >
                      <Link
                        href={href}
                        className="wl-thumb"
                        onClick={(ev) => {
                          if (
                            ev.metaKey ||
                            ev.ctrlKey ||
                            ev.shiftKey ||
                            ev.altKey ||
                            ev.button !== 0
                          ) {
                            return;
                          }
                          ev.preventDefault();
                          withViewTransition(() => router.push(href));
                        }}
                      >
                        <AnimeImage
                          src={e.image}
                          title={e.title}
                          decorative
                          width={72}
                          height={108}
                          sizes="72px"
                          viewTransitionName={vt}
                        />
                      </Link>
                      <div className="wl-body">
                        <Link href={href} className="wl-title">
                          {e.title}
                        </Link>
                        <div className="wl-meta">
                          {e.format ? <span>{e.format}</span> : null}
                          {e.year ? <span>{e.year}</span> : null}
                          {e.score ? (
                            <span className="card-score">
                              ★ {e.score.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="wl-progress-track"
                          aria-hidden
                          title={`${pct}%`}
                        >
                          <span
                            className="wl-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="wl-controls">
                          <label>
                            Status
                            <select
                              className="filter-input"
                              value={e.watchStatus}
                              onChange={(ev) =>
                                onStatus(
                                  e.id,
                                  ev.target.value as WatchStatus,
                                  e.watchStatus,
                                )
                              }
                            >
                              {WATCH_STATUS_TABS.filter(
                                (t) => t.value !== "all",
                              ).map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Progress
                            <input
                              type="number"
                              className="filter-input"
                              min={0}
                              max={maxEp || 9999}
                              value={e.progress}
                              onChange={(ev) =>
                                onProgress(
                                  e.id,
                                  parseInt(ev.target.value, 10) || 0,
                                  e.progress || 0,
                                  maxEp || cap,
                                )
                              }
                            />
                          </label>
                          <label>
                            Your score
                            <input
                              type="number"
                              className="filter-input"
                              min={0}
                              max={10}
                              step={0.5}
                              value={e.userRating || ""}
                              placeholder="—"
                              onChange={(ev) =>
                                setUserRating(
                                  e.id,
                                  parseFloat(ev.target.value) || 0,
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => onRemove(e.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {entries.length > 0 ? (
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    window.confirm("Clear entire watchlist?")
                  ) {
                    clearAll();
                    playCue("remove");
                  }
                }}
              >
                Clear all
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
