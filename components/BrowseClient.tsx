"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(initialError);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, startTransition] = useTransition();

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
  const feed = parsed.feed;

  useEffect(() => {
    setQ(searchParams.get("q") || "");
    setGenre(searchParams.get("genre") || "");
    setStatus(searchParams.get("status") || "");
    setFormat(searchParams.get("format") || "");
    setYear(searchParams.get("year") || "");
    setSort(searchParams.get("sort") || "score");
    setItems(initialItems);
    setTotal(initialTotal);
    setHasNext(initialHasNext);
    setError(initialError);
    setPage(1);
  }, [searchParams, initialItems, initialTotal, initialHasNext, initialError]);

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
      }
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  const applyFilters = () => {
    pushParams({
      q: q.trim() || undefined,
      genre: genre || undefined,
      status: status || undefined,
      format: format || undefined,
      year: year || undefined,
      sort: sort || "score",
      feed: q.trim() || genre || status || format || year ? undefined : feed,
    });
  };

  const resetFilters = () => {
    setQ("");
    setGenre("");
    setStatus("");
    setFormat("");
    setYear("");
    setSort("score");
    startTransition(() => router.push(`${pathname}?feed=trending`));
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

  return (
    <div>
      <div className="feed-tabs" role="tablist" aria-label="Discover feeds">
        {FEED_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={feed === t.value && parsed.mode === "feed"}
            className={
              "feed-tab" +
              (feed === t.value && parsed.mode === "feed" ? " active" : "")
            }
            onClick={() => pushParams({ feed: t.value })}
          >
            <span aria-hidden>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="filter-panel">
        <div className="filter-row search-row">
          <input
            type="search"
            className="filter-input filter-search"
            placeholder="Search titles…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            aria-label="Search anime"
          />
          <button type="button" className="btn btn-accent btn-sm" onClick={applyFilters}>
            Search
          </button>
        </div>

        <div className="filter-row">
          <label className="filter-field">
            <span className="filter-label">Genre</span>
            <select className="filter-input" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">Any genre</option>
              {ANIME_GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span className="filter-label">Status</span>
            <select className="filter-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {MEDIA_STATUSES.map((s) => (
                <option key={s.value || "any"} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span className="filter-label">Format</span>
            <select className="filter-input" value={format} onChange={(e) => setFormat(e.target.value)}>
              {MEDIA_FORMATS.map((f) => (
                <option key={f.value || "any"} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span className="filter-label">Year</span>
            <select className="filter-input" value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => (
                <option key={y.value || "any"} value={y.value}>{y.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span className="filter-label">Sort</span>
            <select className="filter-input" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-actions">
          <button type="button" className="btn btn-accent btn-sm" onClick={applyFilters}>
            Apply filters
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </div>

      <div className="section-head">
        <h2>
          <span className="accent">📡</span> {title}
          {pending ? <span className="meta" style={{ marginLeft: 10 }}>Tuning…</span> : null}
        </h2>
        <span className="meta">
          {error ? "—" : `${items.length} shown${total ? ` · ${total.toLocaleString()} total` : ""}`}
        </span>
      </div>

      {error ? (
        <div className="state-box error">
          <p>Could not load results.</p>
          <p style={{ marginTop: 8, fontSize: "0.85rem", opacity: 0.85 }}>{error}</p>
        </div>
      ) : pending ? (
        <PosterSkeleton count={12} label="Tuning the frequency…" />
      ) : (
        <>
          <AnimeGrid items={items} />
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
