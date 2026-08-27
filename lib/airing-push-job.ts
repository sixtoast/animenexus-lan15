/**
 * Airing → push job helpers (API Expansion II Sprint 28).
 * Finds episodes in a time window from AniList schedule — soft-fail upstream.
 */

import { fetchAiringSchedule } from "./anilist-discover";

export type AiringSoonItem = {
  anilistId: number;
  title: string;
  episode: number;
  airingAt: number; // unix seconds
  minutesFromNow: number;
};

/**
 * Episodes whose air time falls in [now - pastMin, now + futureMin].
 * Default: last 15 min through next 45 min ("just aired" + "soon").
 */
export async function findAiringInWindow(opts?: {
  pastMinutes?: number;
  futureMinutes?: number;
  limit?: number;
}): Promise<AiringSoonItem[]> {
  const past = opts?.pastMinutes ?? 15;
  const future = opts?.futureMinutes ?? 45;
  const limit = opts?.limit ?? 12;

  const nowSec = Math.floor(Date.now() / 1000);
  const from = nowSec - past * 60;
  const to = nowSec + future * 60;

  // Pull ~48h of schedule then filter (AniList helper already windows)
  let schedule: Awaited<ReturnType<typeof fetchAiringSchedule>> = [];
  try {
    schedule = await fetchAiringSchedule(48);
  } catch {
    return [];
  }

  const hits: AiringSoonItem[] = [];
  for (const row of schedule) {
    const at = row.airingAt;
    if (typeof at !== "number" || !row.media?.id) continue;
    if (at < from || at > to) continue;
    hits.push({
      anilistId: row.media.id,
      title: row.media.title || `Anime #${row.media.id}`,
      episode: row.episode,
      airingAt: at,
      minutesFromNow: Math.round((at - nowSec) / 60),
    });
  }

  hits.sort((a, b) => a.airingAt - b.airingAt);
  return hits.slice(0, limit);
}

export function formatAiringPushBody(item: AiringSoonItem): {
  title: string;
  body: string;
  url: string;
} {
  const when =
    item.minutesFromNow <= 0
      ? "just aired"
      : item.minutesFromNow <= 5
        ? "airs in a few minutes"
        : `airs in ~${item.minutesFromNow} min`;
  return {
    title: `${item.title}`,
    body: `Ep ${item.episode} ${when}`,
    url: `/anime/${item.anilistId}`,
  };
}
