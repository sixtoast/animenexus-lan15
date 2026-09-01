"use client";

import { useMemo } from "react";
import { parseIntentSearch } from "@/lib/intent-search";

export function BrowseIntentHint({ query }: { query: string }) {
  const parsed = useMemo(
    () => (query.trim().length >= 3 ? parseIntentSearch(query) : null),
    [query],
  );
  if (!parsed?.isIntentQuery) return null;
  return (
    <p className="intent-search-hint" role="status">
      Understood as · {parsed.summary}
      {parsed.experienceSlug ? ` · try /mood/${parsed.experienceSlug}` : ""}
    </p>
  );
}
