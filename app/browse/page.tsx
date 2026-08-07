import { Suspense } from "react";
import { BrowseClient } from "@/components/BrowseClient";
import { fetchDiscover, fetchFiltered, searchAnime } from "@/lib/anilist";
import type { AnimeFilters, DiscoverFeed } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

async function loadInitial(sp: Record<string, string | string[] | undefined>) {
  const q = one(sp.q).trim();
  const feed = (one(sp.feed) as DiscoverFeed) || "trending";
  const filters: AnimeFilters = {
    genre: one(sp.genre) || undefined,
    status: one(sp.status) || undefined,
    format: one(sp.format) || undefined,
    year: one(sp.year) || undefined,
    sort: (one(sp.sort) as AnimeFilters["sort"]) || "score",
    adultFilter: "exclude",
    search: q || undefined,
  };

  const hasFilter =
    Boolean(filters.genre) ||
    Boolean(filters.status) ||
    Boolean(filters.format) ||
    Boolean(filters.year);

  try {
    if (q) {
      const page = await searchAnime(q, 1, 24);
      return {
        items: page.data,
        total: page.pagination.total,
        hasNext: page.pagination.hasNextPage,
        error: null as string | null,
      };
    }
    if (hasFilter) {
      const page = await fetchFiltered(filters, 1, 24);
      return {
        items: page.data,
        total: page.pagination.total,
        hasNext: page.pagination.hasNextPage,
        error: null as string | null,
      };
    }
    const page = await fetchDiscover(feed, 1, 24, "exclude");
    return {
      items: page.data,
      total: page.pagination.total,
      hasNext: page.pagination.hasNextPage,
      error: null as string | null,
    };
  } catch (e) {
    return {
      items: [],
      total: 0,
      hasNext: false,
      error: e instanceof Error ? e.message : "Failed to reach AniList",
    };
  }
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const initial = await loadInitial(sp);

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Browse · Sprint 2</div>
          <h1>
            Discover <span>catalog</span>
          </h1>
          <p>
            Search, filter by genre and year, or switch feeds. Results stay in
            the URL so you can share a frequency.
          </p>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <Suspense
          fallback={
            <div className="state-box">
              <div className="spinner" />
              <p>Tuning the antenna…</p>
            </div>
          }
        >
          <BrowseClient
            key={JSON.stringify(sp)}
            initialItems={initial.items}
            initialTotal={initial.total}
            initialHasNext={initial.hasNext}
            initialError={initial.error}
          />
        </Suspense>
      </section>
    </main>
  );
}
