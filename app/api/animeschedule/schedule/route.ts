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
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\\s+/g, " ");
}

function titleVariants(media: any) {
  return [
    media.title,
    media.titleRomaji,
    media.titleNative,
    ...(Array.isArray(media.synonyms) ? media.synonyms : []),
  ].filter((x): x is string => typeof x === "string" && x.trim()).map(normalise);
}

function entryVariants(entry: ListEntry) {
  return [
    entry.preferredTitle,
    entry.route?.replace(/[-_]/g, " "),
  ].filter((x): x is string => typeof x === "string" && x.trim()).map(normalise);
}

function titleMatch(media: any, entry: ListEntry) {
  const mediaTitles = titleVariants(media);
  const entryTitles = entryVariants(entry);
  if (!mediaTitles.length || !entryTitles.length) return { matched: false, confidence: 0 };

  for (const a of mediaTitles) for (const b of entryTitles) {
    if (a === b) return { matched: true, confidence: 1 };
  }

  // Avoid dangerous fuzzy matches on very short titles.
  for (const a of mediaTitles) for (const b of entryTitles) {
    if (a.length >= 10 && b.length >= 10 && (a.includes(b) || b.includes(a))) {
      return { matched: true, confidence: 0.88 };
    }
  }
  return { matched: false, confidence: 0 };
}

function tokenSet(value: string) {
  return new Set(normalise(value).split(" ").filter((x) => x.length >= 3));
}

function overlapScore(a: string, b: string) {
  const aa = tokenSet(a), bb = tokenSet(b);
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  for (const token of aa) if (bb.has(token)) common++;
  return common / Math.max(aa.size, bb.size);
}

function listFieldValues(entry: ListEntry, field: "genres" | "studios") {
  return String(entry[field] || "").split(/[,·|]/).map((x) => normalise(x)).filter(Boolean);
}

function recommendationScore(media: any, watched: ListEntry[]) {
  const mediaGenres = String(media.genre || "").split(/[,·|]/).map((x: string) => normalise(x)).filter(Boolean);
  const mediaStudios = (media.studios || []).map((x: any) => normalise(String(x?.name || x))).filter(Boolean);

  let score = 0;
  const reasons: { label: string; weight: number }[] = [];

  for (const entry of watched) {
    const statusWeight = entry.listStatus === "completed" ? 0.75 : 1;
    for (const genre of mediaGenres) {
      if (listFieldValues(entry, "genres").some((x) => x === genre)) {
        score += 5 * statusWeight;
        if (!reasons.some((r) => r.label === genre)) reasons.push({ label: genre, weight: 5 });
      }
    }
    for (const studio of mediaStudios) {
      if (listFieldValues(entry, "studios").some((x) => x === studio)) {
        score += 4 * statusWeight;
        if (!reasons.some((r) => r.label === studio)) reasons.push({ label: studio, weight: 4 });
      }
    }
  }

  const popularity = Math.min(1, Number(media.popularity || 0) / 100000);
  const quality = Math.min(1, Number(media.score || 0) / 100);
  score += quality * 1.5 + popularity * 0.5;

  return {
    score,
    reason: reasons.sort((a, b) => b.weight - a.weight).slice(0, 2).map((r) => r.label).join(" · ") || "New on your radar",
  };
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
    for (const genre of String(media.genre || "").split(/[,·]/)) {
      const name = String(genre).trim().toLowerCase();
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
      let bestMatch: ListEntry | undefined;
      let bestConfidence = 0;
      for (const entry of listValues) {
        const match = titleMatch(row.media, entry);
        if (match.confidence > bestConfidence) {
          bestConfidence = match.confidence;
          bestMatch = entry;
        }
      }
      const matches = bestMatch;
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
        inList: Boolean(matches && bestConfidence >= 0.88),
        matchConfidence: bestConfidence,
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
        .map((x) => ({ ...x, ...recommendationScore(x, watched) }))
        .filter((x) => x.score >= 2.5)
        .sort((a, b) => b.score - a.score || Number(b.listScore || 0) - Number(a.listScore || 0))
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
