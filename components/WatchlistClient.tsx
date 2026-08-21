"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWatchlist } from "@/components/WatchlistProvider";
import { WatchlistToolbar } from "@/components/WatchlistToolbar";
import { WatchlistPresentationToggle } from "@/components/WatchlistPresentationToggle";
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
  groupShelfByCluster,
  projectShelfObjects,
  readWatchlistPresentation,
  SHELF_CLUSTER_LABELS,
  type WatchlistPresentation,
} from "@/lib/living-shelf";
import {
  getAnimeObjectId,
  getAnimeViewTransitionName,
  withViewTransition,
} from "@/lib/view-transition";

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

  useEffect(() => {
    setPresentation(readWatchlistPresentation());
  }, []);

  const user = useMemo(() => userResonance(entries), [entries]);

  const shelfObjects = useMemo(
    () => projectShelfObjects(entries),
    [entries],
  );
  const shelfGroups = useMemo(
    () => groupShelfByCluster(shelfObjects),
    [shelfObjects],
  );

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
            Shelf projection active — spatial canvas arrives next. Clusters use
            your real shelf data.
          </p>
        ) : null}
      </div>

      {presentation === "shelf" && entries.length > 0 ? (
        <div className="shelf-projection" aria-label="Shelf clusters preview">
          {(
            [
              "watching",
              "planning",
              "paused",
              "completed",
              "dropped",
            ] as const
          ).map((cluster) => {
            const list = shelfGroups[cluster];
            if (!list.length) return null;
            return (
              <section key={cluster} className="shelf-cluster-preview">
                <h3 className="nx-kicker" style={{ marginBottom: 10 }}>
                  {SHELF_CLUSTER_LABELS[cluster]}
                  <span className="wl-count" style={{ marginLeft: 8 }}>
                    {list.length}
                  </span>
                </h3>
                <ul className="shelf-cluster-grid">
                  {list.map((o) => (
                    <li
                      key={o.animeId}
                      data-anime-object-id={getAnimeObjectId(o.animeId)}
                      data-shelf-depth={o.depth.toFixed(2)}
                      data-shelf-importance={o.importance.toFixed(2)}
                      style={{
                        opacity: 0.55 + (1 - o.depth) * 0.45,
                        transform: `scale(${0.85 + o.scale * 0.12})`,
                      }}
                    >
                      <Link href={`/anime/${o.animeId}`} className="shelf-obj-link">
                        <AnimeImage
                          src={o.image}
                          title={o.title}
                          decorative
                          width={96}
                          height={144}
                          sizes="96px"
                          viewTransitionName={getAnimeViewTransitionName(
                            o.animeId,
                          )}
                        />
                        <span className="shelf-obj-title">{o.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : null}

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
            <div className="state-box lantern-empty">
              <h3>The shelf is quiet</h3>
              <p>
                Lantern has nothing sealed here yet. When you add a title from any
                detail page, it becomes part of what the desk remembers.
              </p>
              <p style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Link href="/browse" className="btn btn-accent btn-sm">
                  Browse catalog →
                </Link>
                <Link href="/daily" className="btn btn-outline btn-sm">
                  Daily pick
                </Link>
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="state-box lantern-empty">
              <h3>Nothing on this channel</h3>
              <p>
                No titles in “{tab}” yet. Move something from another status, or
                add a new seal from a detail page.
              </p>
            </div>
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
                  const vt = getAnimeViewTransitionName(e.id);
                  const href = `/anime/${e.id}`;
                  return (
                    <li
                      key={e.id}
                      className="wl-row"
                      data-anime-object-id={getAnimeObjectId(e.id)}
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
                        <div className="wl-controls">
                          <label>
                            Status
                            <select
                              className="filter-input"
                              value={e.watchStatus}
                              onChange={(ev) =>
                                setStatus(e.id, ev.target.value as WatchStatus)
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
                                setProgress(
                                  e.id,
                                  parseInt(ev.target.value, 10) || 0,
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
                            onClick={() => remove(e.id)}
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
                  }
                }}
              >
                Clear all
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {presentation === "shelf" && entries.length === 0 ? (
        <div className="state-box lantern-empty">
          <h3>Empty archive</h3>
          <p>Seal titles in Manage mode first — the shelf projects from your list.</p>
          <button
            type="button"
            className="btn btn-accent btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => setPresentation("manage")}
          >
            Open Manage
          </button>
        </div>
      ) : null}
    </div>
  );
}
