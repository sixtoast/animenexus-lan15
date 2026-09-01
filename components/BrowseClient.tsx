"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimeGrid } from "@/components/AnimeGrid";
import { PosterSkeleton } from "@/components/PosterSkeleton";
import { loadBrowsePage, parseBrowseParams } from "@/lib/browse-query";
import {
  ANIME_GENRES,
  FEED_TABS,
  MEDIA_FORMATS,
  MEDIA_STATUSES,
  SORT_OPTIONS,
  yearOptions,
} from "@/lib/genres";
import type { Anime } from "@/lib/types";
import { emitNexus } from "@/lib/nexus";
import { useWatchlist } from "@/components/WatchlistProvider";
import { SignalError, signalErrorBody } from "@/components/SignalError";
import { SignalEmpty } from "@/components/SignalEmpty";
import { playCue } from "@/lib/sound-engine";
import { BrowseIntentHint } from "@/components/BrowseIntentHint";
import { getExperienceIntent } from "@/lib/viewing-intent";
import { logBehaviour } from "@/lib/behaviour-events";
import { useSessionRevision } from "@/lib/use-session-revision";
import { blendShelfItems } from "@/lib/browse-shelf-blend";

type Props = {
  initialItems: Anime[];
  initialTotal: number;
  initialHasNext: boolean;
  initialError: string | null;
};

export function BrowseClient({
  initialItems,
  initialTotal,
  initialHasNext,
  initialError,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { entries, ready } = useWatchlist();
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(initialError);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, startTransition] = useTransition();
  const [shelfBlend, setShelfBlend] = useState(true);
  const [searchFocus, setSearchFocus] = useState(false);
  const [flashField, setFlashField] = useState<string | null>(null);
  const [displayTotal, setDisplayTotal] = useState(initialTotal);
  const [leaving, setLeaving] = useState(false);
  const sessionKey = useSessionRevision();
  const prevTotal = useRef(initialTotal);

  const parsed = useMemo(
    () => parseBrowseParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [format, setFormat] = useState(searchParams.get("format") || "");
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "score");
  const experience = searchParams.get("experience") || "";
  const feed = parsed.feed;

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    const g = searchParams.get("genre") || "";
    const expSlug = searchParams.get("experience") || "";
    const exp = expSlug ? getExperienceIntent(expSlug) : undefined;
    setGenre(g || (exp?.genreHints[0] ?? ""));
    setStatus(searchParams.get("status") || "");
    setFormat(searchParams.get("format") || "");
    setYear(searchParams.get("year") || "");
    const sortParam = searchParams.get("sort");
    setSort(sortParam || exp?.sort || "score");
    setItems(initialItems);
    setTotal(initialTotal);
    setHasNext(initialHasNext);
    setError(initialError);
    setPage(1);
    setLeaving(false);
  }, [searchParams, initialItems, initialTotal, initialHasNext, initialError]);

  useEffect(() => {
    if (total === prevTotal.current) {
      setDisplayTotal(total);
      return;
    }
    const from = prevTotal.current;
    const to = total;
    prevTotal.current = total;
    const start = performance.now();
    const dur = 280;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayTotal(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (patch.q !== undefined && patch.q) next.delete("feed");
      if (patch.feed) {
        next.delete("q");
        next.delete("genre");
        next.delete("status");
        next.delete("format");
        next.delete("year");
        next.delete("experience");
      }
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  const flash = (field: string) => {
    setFlashField(field);
    window.setTimeout(() => setFlashField(null), 320);
  };

  const applyFilters = () => {
    const query = q.trim();
    playCue("filter_select");
    pushParams({
      q: query || undefined,
      genre: genre || undefined,
      status: status || undefined,
      format: format || undefined,
      year: year || undefined,
      sort: sort || "score",
      feed: query || genre || status || format || year ? undefined : feed,
      experience: experience || undefined,
    });
    if (query) {
      emitNexus({ type: "search_performed", query });
      logBehaviour("search", { meta: { query } });
    }
    if (genre) emitNexus({ type: "filter_used", filter: `genre:${genre}` });
    if (status) emitNexus({ type: "filter_used", filter: `status:${status}` });
    if (format) emitNexus({ type: "filter_used", filter: `format:${format}` });
    if (year) emitNexus({ type: "filter_used", filter: `year:${year}` });
  };

  const resetFilters = () => {
    setQ("");
    setGenre("");
    setStatus("");
    setFormat("");
    setYear("");
    setSort("score");
    playCue("filter_select");
    startTransition(() => router.push(`${pathname}?feed=trending`));
  };

  const onSelectFilter = (
    field: string,
    setter: (v: string) => void,
    value: string,
  ) => {
    setter(value);
    flash(field);
    playCue("filter_select");
  };

  const onLoadMore = async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await loadBrowsePage(
        parsed.mode,
        parsed.feed,
        parsed.filters,
        nextPage,
      );
      setItems((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...result.data.filter((a) => !seen.has(a.id))];
      });
      setPage(nextPage);
      setHasNext(result.pagination.hasNextPage);
      setTotal(result.pagination.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more");
      playCue("error");
    } finally {
      setLoadingMore(false);
    }
  };

  const years = useMemo(() => yearOptions(), []);
  const title =
    parsed.mode === "search"
      ? `Search: “${parsed.filters.search}”`
      : parsed.mode === "filter"
        ? "Filtered results"
        : FEED_TABS.find((t) => t.value === feed)?.label || "Browse";

  const canBlend = ready && entries.length >= 2 && items.length > 1;
  const queryValid = q.trim().length >= 1;

  const displayItems = useMemo(() => {
    if (!shelfBlend || !canBlend) return items;
    return blendShelfItems(items, entries, { q, experience });
  }, [shelfBlend, canBlend, items, entries, q, experience, sessionKey]);

  useEffect(() => {
    if (!pending && displayItems.length === 0 && !error) {
      setLeaving(true);
      const t = window.setTimeout(() => setLeaving(false), 160);
      return () => window.clearTimeout(t);
    }
  }, [pending, displayItems.length, error]);

  return (
    <div className="browse-desk">
      <div className="feed-tabs" role="tablist" aria-label="Discover feeds">
        {FEED_TABS.map((t) => {
          const active = feed === t.value && parsed.mode === "feed";
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={"feed-tab" + (active ? " active" : "")}
              onClick={() => {
                playCue("filter_select");
                pushParams({ feed: t.value });
              }}
            >
              <span aria-hidden>{t.icon}</span> {t.label}
            </button>
          );
        })}
      </div>

      <div
        className={
          "filter-panel" + (searchFocus ? " filter-panel--search-focus" : "")
        }
      >
        <div className="filter-row search-row">
          <input
            type="search"
            className={
              "filter-input filter-search" +
              (queryValid ? " filter-search--valid" : "")
            }
            placeholder="Search titles or a night — e.g. funny and short"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).classList.add(
                  "filter-search--pulse",
                );
                window.setTimeout(() => {
                  (e.target as HTMLInputElement).classList.remove(
                    "filter-search--pulse",
                  );
                }, 220);
                applyFilters();
              }
            }}
            aria-label="Search anime"
          />
          <button
            type="button"
            className={
              "btn btn-accent btn-sm" + (queryValid ? " btn-search-ready" : "")
            }
            onClick={applyFilters}
          >
            Search
          </button>
        </div>
        <BrowseIntentHint query={q} />
        {experience ? (
          <p className="intent-search-hint" role="status">
            Experience pack ·{" "}
            {getExperienceIntent(experience)?.label || experience}
            {" · "}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ display: "inline", padding: "0 4px", minHeight: 0 }}
              onClick={() => {
                playCue("filter_select");
                pushParams({ experience: undefined });
              }}
            >
              Clear
            </button>
          </p>
        ) : null}

        <div className="filter-row">
          <label
            className={
              "filter-field" +
              (flashField === "genre" ? " filter-field--flash" : "")
            }
          >
            <span className="filter-label">Genre</span>
            <select
              className="filter-input"
              value={genre}
              onChange={(e) =>
                onSelectFilter("genre", setGenre, e.target.value)
              }
            >
              <option value="">Any genre</option>
              {ANIME_GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label
            className={
              "filter-field" +
              (flashField === "status" ? " filter-field--flash" : "")
            }
          >
            <span className="filter-label">Status</span>
            <select
              className="filter-input"
              value={status}
              onChange={(e) =>
                onSelectFilter("status", setStatus, e.target.value)
              }
            >
              {MEDIA_STATUSES.map((s) => (
                <option key={s.value || "any"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label
            className={
              "filter-field" +
              (flashField === "format" ? " filter-field--flash" : "")
            }
          >
            <span className="filter-label">Format</span>
            <select
              className="filter-input"
              value={format}
              onChange={(e) =>
                onSelectFilter("format", setFormat, e.target.value)
              }
            >
              {MEDIA_FORMATS.map((f) => (
                <option key={f.value || "any"} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label
            className={
              "filter-field" +
              (flashField === "year" ? " filter-field--flash" : "")
            }
          >
            <span className="filter-label">Year</span>
            <select
              className="filter-input"
              value={year}
              onChange={(e) =>
                onSelectFilter("year", setYear, e.target.value)
              }
            >
              {years.map((y) => (
                <option key={y.value || "any"} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
          <label
            className={
              "filter-field" +
              (flashField === "sort" ? " filter-field--flash" : "")
            }
          >
            <span className="filter-label">Sort</span>
            <select
              className="filter-input"
              value={sort}
              onChange={(e) =>
                onSelectFilter("sort", setSort, e.target.value)
              }
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={applyFilters}
          >
            Apply filters
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={resetFilters}
          >
            Reset
          </button>
          {canBlend ? (
            <button
              type="button"
              className={
                "btn btn-sm " + (shelfBlend ? "btn-accent" : "btn-outline")
              }
              onClick={() => setShelfBlend((v) => !v)}
              title="Blend catalog order with your shelf resonance"
              aria-pressed={shelfBlend}
            >
              {shelfBlend ? "Shelf blend on" : "Shelf blend off"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="section-head">
        <h2>
          <span className="accent">📡</span> {title}
          {pending ? (
            <span className="meta" style={{ marginLeft: 10 }}>
              Tuning…
            </span>
          ) : null}
        </h2>
        <span className="meta meta-count" aria-live="polite">
          {error
            ? "—"
            : `${items.length} shown${displayTotal ? ` · ${displayTotal.toLocaleString()} total` : ""}${shelfBlend && canBlend ? " · shelf blend" : ""}`}
        </span>
      </div>

      {error ? (
        <SignalError
          title="The signal went quiet."
          body={signalErrorBody(error)}
          detail={error}
          onRetry={() => {
            setError(null);
            router.refresh();
          }}
          retryLabel="Try again"
        />
      ) : pending ? (
        <PosterSkeleton count={12} label="search" />
      ) : displayItems.length === 0 ? (
        <div className={leaving ? "browse-leave" : undefined}>
          <SignalEmpty
            title="Nothing on this frequency."
            body={
              parsed.mode === "search"
                ? `No titles matched “${parsed.filters.search || q}”. Try a shorter query or reset filters.`
                : "This filter set is empty. Open Trending or clear filters."
            }
            action={{ label: "Reset filters", onClick: resetFilters }}
            secondary={{ label: "Trending", href: "/browse?feed=trending" }}
          />
        </div>
      ) : (
        <>
          <AnimeGrid items={displayItems} trackBehaviour />
          {hasNext ? (
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
