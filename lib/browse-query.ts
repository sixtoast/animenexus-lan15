import type { AnimeFilters, DiscoverFeed } from "./types";
import { fetchDiscover, fetchFiltered, searchAnime } from "./anilist";

export function parseBrowseParams(sp: URLSearchParams): {
  feed: DiscoverFeed;
  filters: AnimeFilters;
  mode: "feed" | "filter" | "search";
} {
  const q = (sp.get("q") || "").trim();
  const feed = (sp.get("feed") as DiscoverFeed) || "trending";
  const filters: AnimeFilters = {
    genre: sp.get("genre") || undefined,
    status: sp.get("status") || undefined,
    format: sp.get("format") || undefined,
    year: sp.get("year") || undefined,
    sort: (sp.get("sort") as AnimeFilters["sort"]) || "score",
    adultFilter: "exclude",
    search: q || undefined,
  };

  const hasFilter =
    Boolean(filters.genre) ||
    Boolean(filters.status) ||
    Boolean(filters.format) ||
    Boolean(filters.year);

  if (q) return { feed, filters, mode: "search" };
  if (hasFilter) return { feed, filters, mode: "filter" };
  return { feed, filters, mode: "feed" };
}

export async function loadBrowsePage(
  mode: "feed" | "filter" | "search",
  feed: DiscoverFeed,
  filters: AnimeFilters,
  page: number,
) {
  if (mode === "search" && filters.search) {
    return searchAnime(filters.search, page, 24);
  }
  if (mode === "filter") {
    return fetchFiltered(filters, page, 24);
  }
  return fetchDiscover(feed, page, 24, "exclude");
}
