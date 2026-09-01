import "../cold-start.css";
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
  const genre = one(sp.genre);
  const status = one(sp.status);
  const format = one(sp.format);
  const year = one(sp.year);
  const sort = (one(sp.sort) || "score") as AnimeFilters["sort"];
  const feed = (one(sp.feed) || "trending") as DiscoverFeed;

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
    if (genre || status || format || year) {
      const filters: AnimeFilters = {
        genre: genre || undefined,
        status: status || undefined,
        format: format || undefined,
        year: year || undefined,
        sort: sort || "score",
        adultFilter: "exclude",
      };
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
      error: e instanceof Error ? e.message : "Failed to load catalog",
    };
  }
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { items, total, hasNext, error } = await loadInitial(sp);

  return (
    <main>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="container">
          <div className="hero-badge">Browse · catalog</div>
          <h1>
            Find a <span>signal</span>
          </h1>
          <p>
            Search titles or describe a night — e.g. “something funny and short”.
            Filters stay soft; shelf blend ranks when you have a list.
          </p>
        </div>
      </section>
      <section className="container" style={{ paddingBottom: 48 }}>
        <Suspense fallback={<p className="meta">Opening catalog…</p>}>
          <BrowseClient
            initialItems={items}
            initialTotal={total}
            initialHasNext={hasNext}
            initialError={error}
          />
        </Suspense>
      </section>
    </main>
  );
}
