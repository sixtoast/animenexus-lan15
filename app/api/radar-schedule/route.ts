import { NextRequest, NextResponse } from "next/server";
import { identityFromAnime } from "@/lib/anime-identity";
import { fetchAnimeById } from "@/lib/anilist";
import { getAnimeSchedule, isAnimeScheduleConfigured } from "@/lib/providers/anime-schedule";
import {
  classifyWindow,
  pickNextFromBroadcasts,
  type RadarContact,
} from "@/lib/radar-schedule";
import type { Anime } from "@/lib/types";

export const runtime = "nodejs";

type BodyItem = {
  id: number;
  title?: string;
  image?: string;
};

/**
 * POST { items: { id, title?, image? }[] }
 * Resolves next air times for watchlist/shelf ids via AnimeSchedule when configured.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items?: BodyItem[] };
    const items = (body.items || []).slice(0, 20);
    if (!items.length) {
      return NextResponse.json({ contacts: [], configured: isAnimeScheduleConfigured() });
    }

    if (!isAnimeScheduleConfigured()) {
      return NextResponse.json({
        contacts: [] as RadarContact[],
        configured: false,
        note: "ANIMESCHEDULE_API_KEY not set — shelf air times unavailable",
      });
    }

    const contacts: RadarContact[] = [];

    // Sequential under rate limit — avoid flooding AnimeSchedule
    for (const item of items) {
      let anime: Anime | null = null;
      try {
        anime = await fetchAnimeById(item.id);
      } catch {
        anime = null;
      }
      const title = item.title || anime?.title || `Anime ${item.id}`;
      const image = item.image || anime?.image;

      const identity = anime
        ? identityFromAnime(anime)
        : {
            anilistId: item.id,
            titles: { english: title },
            confidence: { anilist: 0.8 },
            mappings: [],
            origin: "anilist" as const,
          };

      const broadcasts = await getAnimeSchedule(identity);
      const next = pickNextFromBroadcasts(broadcasts);
      if (!next) continue;

      contacts.push({
        anilistId: item.id,
        title,
        image,
        episode: next.episode,
        band: next.band,
        at: next.at,
        delayed: next.delayed,
        platforms: next.platforms,
        source: "animeschedule",
        window: classifyWindow(next.at),
      });
    }

    return NextResponse.json({
      contacts,
      configured: true,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "radar-schedule failed",
        contacts: [],
        configured: isAnimeScheduleConfigured(),
      },
      { status: 502 },
    );
  }
}
