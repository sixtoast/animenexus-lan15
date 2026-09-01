import "../cold-start.css";
import { Suspense } from "react";
import { BrowseClient } from "@/components/BrowseClient";
import { fetchDiscover, fetchFiltered, searchAnime } from "@/lib/anilist";
import type { AnimeFilters, DiscoverFeed } from "@/lib/types";
import { getExperienceIntent } from "@/lib/viewing-intent";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

async function loadInitial(sp: Record<string, string | string[] | undefined>) {
  const q = one(sp.q).trim();
  let genre = one(sp.genre);
  const status = one(sp.status);
  const format = one(sp.format);
  const year = one(sp.year);
  let sort = (one(sp.sort) || "score") as AnimeFilters["sort"];
  const feed = (one(sp.feed) || "trending") as DiscoverFeed;
  const experience = one(sp.experience);
  const exp = experience ? getExperienceIntent(experience) : undefined;

  // Soft seed from experiential pack when user didn't set hard filters
  if (exp && !q) {
    if (!genre && exp.genreHints[0]) genre = exp.genreHints[0];
    if (!one(sp.sort) && exp.sort) sort = exp.sort as AnimeFilters["sort"];
  }

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
    if (genre || status || format || year || exp) {
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
          <p className="kicker">Catalog</p>
          <h1>Browse the signal</h1>
          <p className="hero-lead">
            Search, filters, and feeds — shelf blend ranks results for you when
            you have a list.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Suspense fallback={null}>
            <BrowseClient
              initialItems={items}
              initialTotal={total}
              initialHasNext={hasNext}
              initialError={error}
            />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
