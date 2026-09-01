import type { Anime, WatchlistEntry } from "@/lib/types";
import { rankRecommendations } from "@/lib/recommend-rank";
import { rejectedAnimeIds } from "@/lib/recommend-feedback";
import { parseIntentSearch } from "@/lib/intent-search";

export function blendShelfItems(
  items: Anime[],
  entries: WatchlistEntry[],
  opts: { q?: string; experience?: string; resonanceWeight?: number },
): Anime[] {
  if (entries.length < 2 || items.length < 2) return items;
  const exclude = new Set<number>([
    ...entries.map((e) => e.id),
    ...rejectedAnimeIds(),
  ]);
  const intent =
    opts.q && opts.q.trim().length >= 3 ? parseIntentSearch(opts.q) : null;
  const ranked = rankRecommendations(items, entries, {
    excludeIds: exclude,
    resonanceWeight: opts.resonanceWeight ?? 0.45,
    experienceSlug: intent?.experienceSlug || opts.experience || undefined,
  });
  if (!ranked.length) return items;
  const rankedIds = new Set(ranked.map((r) => r.anime.id));
  const tail = items.filter((a) => !rankedIds.has(a.id));
  return [...ranked.map((r) => r.anime), ...tail];
}
