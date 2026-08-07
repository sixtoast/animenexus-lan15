"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/WatchlistProvider";
import { WatchlistToolbar } from "@/components/WatchlistToolbar";
import { SignalBars } from "@/components/ui/SignalBars";
import type { WatchStatus } from "@/lib/types";
import { WATCH_STATUS_TABS } from "@/lib/watchlist-storage";

export function WatchlistClient() {
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

  const filtered = useMemo(() => {
    if (tab === "all") return entries;
    return entries.filter((e) => e.watchStatus === tab);
  }, [entries, tab]);

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

      <WatchlistToolbar />

      {entries.length === 0 ? (
        <div className="state-box lantern-empty">
          <h3>The shelf is quiet</h3>
          <p>
            Lantern has nothing sealed here yet. When you add a title from any
            detail page, it becomes part of what the desk remembers.
          </p>
          <p>
            Start with something trending, a daily pick, or a mood that matches
            tonight.
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
            No titles in “{tab}” yet. Move something from another status, or add
            a new seal from a detail page.
          </p>
        </div>
      ) : (
        <ul className="wl-list">
          {filtered.map((e) => {
            const maxEp =
              typeof e.episodes === "number" ? e.episodes : undefined;
            return (
              <li key={e.id} className="wl-row">
                <Link href={`/anime/${e.id}`} className="wl-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.image} alt="" />
                </Link>
                <div className="wl-body">
                  <Link href={`/anime/${e.id}`} className="wl-title">
                    {e.title}
                  </Link>
                  <div className="wl-meta">
                    {e.format ? <span>{e.format}</span> : null}
                    {e.year ? <span>{e.year}</span> : null}
                    {e.score ? (
                      <span className="card-score">★ {e.score.toFixed(1)}</span>
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
                        {WATCH_STATUS_TABS.filter((t) => t.value !== "all").map(
                          (t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ),
                        )}
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
                          setProgress(e.id, parseInt(ev.target.value, 10) || 0)
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
                          setUserRating(e.id, parseFloat(ev.target.value) || 0)
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
    </div>
  );
}
