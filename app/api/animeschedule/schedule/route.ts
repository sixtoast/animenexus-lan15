import { NextResponse } from "next/server";
import {
  fetchAnimeScheduleList,
  getAnimeScheduleAccessToken,
  isAnimeScheduleOAuthConfigured,
} from "@/lib/animeschedule-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://animeschedule.net/api/v3";
const IMAGE_BASE = "https://img.animeschedule.net/production/assets/public/img/";

type TimetableAnime = {
  title?: string; route: string; romaji?: string; english?: string; native?: string;
  episodeDate?: string; episodeNumber?: number; subtractedEpisodeNumber?: number;
  episodes?: number; lengthMin?: number; imageVersionRoute?: string;
  delayedText?: string; delayedFrom?: string; delayedUntil?: string;
  status?: string; airingStatus?: string; airType?: string;
  streams?: unknown[];
};

function arrayFrom<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of ["timetable", "data", "anime", "items"]) {
      if (Array.isArray(o[key])) return o[key] as T[];
    }
  }
  return [];
}

function listEntries(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object") return {};
  const raw = (value as any).listAnime ?? value;
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((x: any) => [x.route, x]));
  return raw && typeof raw === "object" ? raw : {};
}

async function fetchTimetable(tz: string) {
  const url = new URL(`${API}/timetables/all`);
  url.searchParams.set("tz", tz);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`AnimeSchedule timetable failed: ${res.status}`);
  return arrayFrom<TimetableAnime>(await res.json());
}

async function fetchAnime(route: string) {
  const res = await fetch(`${API}/anime/${encodeURIComponent(route)}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return (await res.json()) as any;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tz = searchParams.get("tz") || "Africa/Johannesburg";
  const connected = isAnimeScheduleOAuthConfigured() && Boolean(await getAnimeScheduleAccessToken());
  const accessToken = connected ? await getAnimeScheduleAccessToken() : null;

  try {
    const timetable = await fetchTimetable(tz);
    let entries: Record<string, any> = {};
    let username: string | null = null;

    if (accessToken) {
      const list = await fetchAnimeScheduleList(accessToken, { limit: 200 });
      if (list) {
        entries = listEntries(list);
        username = list.username || null;
      }
    }

    const now = new Date();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now);

    const items = timetable.map((item) => {
      const list = entries[item.route] ?? null;
      const date = item.episodeDate ? item.episodeDate.slice(0, 10) : null;
      return {
        ...item,
        image: item.imageVersionRoute ? IMAGE_BASE + item.imageVersionRoute : null,
        date,
        isToday: date === today,
        inList: Boolean(list),
        listStatus: list?.listStatus ?? null,
        episodesSeen: Number(list?.episodesSeen ?? 0),
        listEpisodes: Number(list?.episodes ?? item.episodes ?? 0),
        latestEpisode: Number(list?.latestEpisode ?? item.episodeNumber ?? 0),
        listScore: list?.manualScore ?? null,
        preferredTitle: list?.preferredTitle ?? null,
      };
    });

    const watching = Object.values(entries).filter((x: any) => x.listStatus === "watching");
    const catchUp = watching
      .map((x: any) => ({
        route: x.route,
        title: x.preferredTitle || x.route,
        episodesSeen: Number(x.episodesSeen || 0),
        latestEpisode: Number(x.latestEpisode || 0),
        gap: Math.max(0, Number(x.latestEpisode || 0) - Number(x.episodesSeen || 0)),
        image: x.imageVersionRoute ? IMAGE_BASE + x.imageVersionRoute : null,
        status: x.status || "Ongoing",
      }))
      .filter((x) => x.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 20);

    const newItems = items.filter((x) => !x.inList).slice(0, 12);
    const candidates = newItems.slice(0, 8);
    const profiles = await Promise.all(candidates.map(async (x) => {
      const a = await fetchAnime(x.route);
      return a ? {
        route: x.route, title: a.title || x.title, image: x.image,
        genres: Array.isArray(a.genres) ? a.genres.map((g: any) => g.name).filter(Boolean) : [],
        studios: Array.isArray(a.studios) ? a.studios.map((g: any) => g.name).filter(Boolean) : [],
        score: a.stats?.averageScore ?? 0,
        status: a.status,
      } : null;
    }));

    const watchedProfiles = Object.values(entries).filter((x: any) => x.listStatus === "watching" || x.listStatus === "completed");
    const likedTokens = new Set<string>();
    for (const x of watchedProfiles) {
      for (const token of String(x.genres || "").split(/(?=[A-Z])/)) if (token.length > 2) likedTokens.add(token.toLowerCase());
      for (const token of String(x.studios || "").split(/(?=[A-Z])/)) if (token.length > 2) likedTokens.add(token.toLowerCase());
    }
    const recommendations = profiles.filter(Boolean).map((x: any) => ({
      ...x,
      reason: x.genres.find((g: string) => likedTokens.has(g.toLowerCase())) || x.studios.find((s: string) => likedTokens.has(s.toLowerCase())) || "New on your radar",
    })).sort((a: any, b: any) => Number(b.score) - Number(a.score)).slice(0, 6);

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
      connected,
    }, { status: 502 });
  }
}
