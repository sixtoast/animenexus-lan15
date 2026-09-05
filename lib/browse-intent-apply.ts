import { parseIntentSearch } from "./intent-search";

/** Map NL query + current form fields → URL param patch (R8). */
export function browseParamsFromQuery(
  query: string,
  current: {
    genre: string;
    status: string;
    format: string;
    year: string;
    sort: string;
    feed: string;
    experience: string;
  },
): Record<string, string | undefined> {
  const q = query.trim();
  const intent = q.length >= 3 ? parseIntentSearch(q) : null;
  const nextGenre = current.genre || intent?.filters.genre || undefined;
  const nextFormat = current.format || intent?.filters.format || undefined;
  const nextSort = current.sort || intent?.filters.sort || "score";
  const nextExp = current.experience || intent?.experienceSlug || undefined;
  const nextYear = current.year || intent?.filters.year || undefined;
  return {
    q: q || undefined,
    genre: nextGenre,
    status: current.status || undefined,
    format: nextFormat,
    year: nextYear,
    sort: nextSort,
    feed:
      q || nextGenre || current.status || nextFormat || nextYear
        ? undefined
        : current.feed,
    experience: nextExp,
  };
}
