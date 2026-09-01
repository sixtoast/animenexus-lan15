"use client";

import { useMemo } from "react";
import { AnimeGrid } from "@/components/AnimeGrid";
import { useWatchlist } from "@/components/WatchlistProvider";
import { blendShelfItems } from "@/lib/browse-shelf-blend";
import { useSessionRevision } from "@/lib/use-session-revision";
import type { Anime } from "@/lib/types";

type Props = {
  items: Anime[];
  q?: string;
  experience?: string;
  /** When false, renders catalog order as-is */
  blend?: boolean;
};

/** Shelf-blend grid that reorders when session dials change. */
export function BrowseBlendedGrid({
  items,
  q = "",
  experience = "",
  blend = true,
}: Props) {
  const { entries, ready } = useWatchlist();
  const sessionKey = useSessionRevision();

  const display = useMemo(() => {
    if (!blend || !ready || entries.length < 2) return items;
    return blendShelfItems(items, entries, { q, experience });
  }, [blend, ready, entries, items, q, experience, sessionKey]);

  return <AnimeGrid items={display} trackBehaviour />;
}
