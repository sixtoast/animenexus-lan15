/**
 * Shared catalog fallback chain after AniList.
 * Order: Shikimori → MAL official → Simkl → TMDB → Kitsu → Static seed
 */
import type { AnimeFilters, AnimePage, DiscoverFeed } from "./types";
import {
  kitsuDiscover,
  kitsuFiltered,
  kitsuSearch,
} from "./providers/kitsu";
import {
  shikiDiscover,
  shikiFiltered,
  shikiSearch,
} from "./providers/shikimori";
import {
  malOfficialDiscover,
  malOfficialSearch,
  malOfficialFiltered,
  isMalOfficialConfigured,
} from "./providers/mal-official";
import {
  tmdbAnimeDiscover,
  tmdbAnimeSearch,
  isTmdbConfigured,
} from "./providers/tmdb-anime";
import {
  staticDiscover,
  staticSearch,
  staticFiltered,
} from "./providers/static-catalog";
import {
  simklSearchAnime,
  simklDiscoverAnime,
  isSimklConfigured,
} from "./providers/simkl";

export function catalogFallbacks(
  kind: "discover" | "search" | "filtered",
  args: {
    feed?: DiscoverFeed;
    search?: string;
    filters?: AnimeFilters;
    page: number;
    perPage: number;
  },
): { name: string; run: () => Promise<AnimePage> }[] {
  const { page, perPage } = args;
  const list: { name: string; run: () => Promise<AnimePage> }[] = [
    {
      name: "Shikimori",
      run: () => {
        if (kind === "discover")
          return shikiDiscover(args.feed || "trending", page, perPage);
        if (kind === "search")
          return shikiSearch(args.search || "", page, perPage);
        return shikiFiltered(args.filters || {}, page, perPage);
      },
    },
  ];
  if (isMalOfficialConfigured()) {
    list.push({
      name: "MAL",
      run: () => {
        if (kind === "discover")
          return malOfficialDiscover(args.feed || "trending", page, perPage);
        if (kind === "search")
          return malOfficialSearch(args.search || "a", page, perPage);
        return malOfficialFiltered(args.filters || {}, page, perPage);
      },
    });
  }
  if (isSimklConfigured()) {
    list.push({
      name: "Simkl",
      run: () => {
        if (kind === "search" || (kind === "filtered" && args.filters?.search))
          return simklSearchAnime(
            args.search || args.filters?.search || "anime",
            page,
            perPage,
          );
        return simklDiscoverAnime(args.feed || "trending", page, perPage);
      },
    });
  }
  if (isTmdbConfigured()) {
    list.push({
      name: "TMDB",
      run: () => {
        if (kind === "search" || (kind === "filtered" && args.filters?.search))
          return tmdbAnimeSearch(
            args.search || args.filters?.search || "anime",
            page,
            perPage,
          );
        return tmdbAnimeDiscover(args.feed || "trending", page, perPage);
      },
    });
  }
  list.push({
    name: "Kitsu",
    run: () => {
      if (kind === "discover")
        return kitsuDiscover(args.feed || "trending", page, perPage);
      if (kind === "search") return kitsuSearch(args.search || "", page, perPage);
      return kitsuFiltered(args.filters || {}, page, perPage);
    },
  });
  list.push({
    name: "Static",
    run: () => {
      if (kind === "search" || (kind === "filtered" && args.filters?.search))
        return staticSearch(
          args.search || args.filters?.search || "",
          page,
          perPage,
        );
      if (kind === "filtered")
        return staticFiltered(
          { search: args.filters?.search, genre: args.filters?.genre },
          page,
          perPage,
        );
      return staticDiscover(args.feed || "trending", page, perPage);
    },
  });
  return list;
}
