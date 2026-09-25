import { NextResponse } from "next/server";
import { fetchAiringSchedule } from "@/lib/anilist-discover";
import {
  fetchAnimeScheduleList,
  getAnimeScheduleAccessToken,
  isAnimeScheduleOAuthConfigured,
} from "@/lib/animeschedule-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListEntry = {
  route: string;
  listStatus?: string;
  episodesSeen?: number;
  episodes?: number;
  manualScore?: number;
  preferredTitle?: string;
  latestEpisode?: number;
  latestEpisodeDate?: string;
  genres?: string;
  studios?: string;
  status?: string;
};

function normalise(value: string) {
  return value.toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractEntries(value: unknown): Record<string, ListEntry> {
  if (!value || typeof value !== "object") return {};
  const raw = (value as any).listAnime ?? {};
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((x: ListEntry) => [x.route, x]));
  }
  return raw && typeof raw === "object" ? raw as Record<string, ListEntry> : {};
}

function dateInZone(epochSeconds: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(epochSeconds * 1000));
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function titleMatch(media: any, entry: ListEntry) {
  const titles = [
    media.title, media.titleRomaji, media.titleNative,
    entry.preferredTitle, entry.route.replace(/-/g, " "),
  ].filter(Boolean).map(normalise);
  const listTitle = normalise(entry.preferredTitle || entry.route);
  return titles.some((title) => title === listTitle);
}

function relevance(media: any, entries: ListEntry[]) {
  let score = 0;
  const reasons: string[] = [];
  for (const entry of entries) {
    const genres = String(entry.genres || "").toLowerCase();
    const studios = String(entry.studios || "").toLowerCase();
    for (const genre of media.genres || []) {
      const name = String(genre?.name || genre).toLowerCase();
      if (name && genres.includes(name)) {
        score += 3;
        if (!reasons.includes(name)) reasons.push(name);
      }
    }
    for (const studio of media.studios || []) {
      const name = String(studio?.name || studio).toLowerCase();
      if (name && studios.includes(name)) {
        score += 2;
        if (!reasons.includes(name)) reasons.push(name);
      }
    }
  }
  return { score, reason: reasons.slice(0, 2).join(" · ") || "New on your radar" };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tz = searchParams.get("tz") || "Africa/Johannesburg";

  try {
    const schedule = await fetchAiringSchedule(24 * 7);
    let entries: Record<string, ListEntry> = {};
    let username: string | null = null;
    let connected = false;

    if (isAnimeScheduleOAuthConfigured()) {
      const token = await getAnimeScheduleAccessToken();
      if (token) {
        const list = await fetchAnimeScheduleList(token, { limit: 200 });
        if (list) {
          entries = extractEntries(list);
          username = list.username || null;
          connected = true;
        }
      }
    }

    const today = dateInZone(Math.floor(Date.now() / 1000), tz);
    const listValues = Object.values(entries);
    const items = schedule.map((row) => {
      const matches = listValues.find((entry) => titleMatch(row.media, entry));
      const date = dateInZone(row.airingAt, tz);
      return {
        route: matches?.route || String(row.media.id),
        title: row.media.title,
        titleRomaji: row.media.titleRomaji,
        titleNative: row.media.titleNative,
        image: row.media.image,
        episodeDate: new Date(row.airingAt * 1000).toISOString(),
        episodeNumber: row.episode,
        date,
        isToday: date === today,
        inList: Boolean(matches),
        listStatus: matches?.listStatus || null,
        episodesSeen: Number(matches?.episodesSeen || 0),
        listEpisodes: Number(matches?.episodes || row.media.episodes || 0),
        listScore: matches?.manualScore ?? null,
        status: row.media.status,
        genres: row.media.genres,
        studios: row.media.studios,
        duration: row.media.duration,
      };
    });

    const watching = listValues.filter((x) => x.listStatus === "watching");
    const catchUp = watching
      .map((x) => ({
        route: x.route,
        title: x.preferredTitle || x.route,
        episodesSeen: Number(x.episodesSeen || 0),
        latestEpisode: Number(x.latestEpisode || 0),
        gap: Math.max(0, Number(x.latestEpisode || 0) - Number(x.episodesSeen || 0)),
        status: x.status || "Ongoing",
      }))
      .filter((x) => x.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 20);

    const watched = listValues.filter((x) => ["watching", "completed"].includes(x.listStatus || ""));
    const recommendations = connected
      ? items.filter((x) => !x.inList)
        .map((x) => ({ ...x, ...relevance(x, watched) }))
        .sort((a, b) => b.score - a.score || String(a.episodeDate).localeCompare(String(b.episodeDate)))
        .slice(0, 6)
      : [];

    return NextResponse.json({
      connected, username, timezone: tz, today,
      items, catchUp, recommendations,
      counts: {
        total: items.length,
        myList: items.filter((x) => x.inList).length,
        new: items.filter((x) => !x.inList).length,
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Schedule unavailable",
      connected: false,
    }, { status: 502 });
  }
}
