"use client";

import { useMemo } from "react";
import { parseIntentSearch } from "@/lib/intent-search";

/** Structured interpretation of NL discover queries (R8). */
export function BrowseIntentHint({ query }: { query: string }) {
  const parsed = useMemo(
    () => (query.trim().length >= 3 ? parseIntentSearch(query) : null),
    [query],
  );
  if (!parsed?.isIntentQuery) return null;

  const chips: string[] = [];
  if (parsed.experienceSlug) chips.push(`Experience · ${parsed.experienceSlug}`);
  if (parsed.filters.genre) chips.push(`Genre · ${parsed.filters.genre}`);
  if (parsed.filters.format) chips.push(`Format · ${parsed.filters.format}`);
  if (parsed.filters.year) chips.push(`Year · ${parsed.filters.year}`);
  if (parsed.filters.sort) chips.push(`Sort · ${parsed.filters.sort}`);
  if (parsed.keyword) chips.push(`Keywords · ${parsed.keyword}`);

  return (
    <div className="discover-heard" role="status">
      <p className="intent-search-hint">Lantern heard · {parsed.summary}</p>
      {chips.length ? (
        <ul className="discover-heard-chips">
          {chips.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
