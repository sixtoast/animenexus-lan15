import { NextRequest, NextResponse } from "next/server";
import { fetchAiringSchedule } from "@/lib/anilist-discover";
import { buildIcsCalendar } from "@/lib/ics-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public ICS of upcoming AniList airing schedule (~72h default).
 * Soft-fail → empty calendar body if upstream fails.
 */
export async function GET(req: NextRequest) {
  const hours = Math.min(
    168,
    Math.max(12, parseInt(req.nextUrl.searchParams.get("hours") || "72", 10) || 72),
  );

  let schedule: Awaited<ReturnType<typeof fetchAiringSchedule>> = [];
  try {
    schedule = await fetchAiringSchedule(hours);
  } catch {
    schedule = [];
  }

  const site =
    (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
    "https://animenexus.local";

  const events = schedule.slice(0, 80).map((row) => ({
    uid: `airing-${row.media.id}-ep${row.episode}-${row.airingAt}@animenexus`,
    title: `${row.media.title} — Ep ${row.episode}`,
    start: row.airingAt,
    durationMinutes: 30,
    description: `Airing episode ${row.episode} (AniList schedule). Times in UTC in this file; your calendar app converts to local.`,
    url: `${site}/anime/${row.media.id}`,
  }));

  const body = buildIcsCalendar(events, {
    calName: `AnimeNexus Airing (${hours}h)`,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="animenexus-airing.ics"',
      "Cache-Control": "public, max-age=120",
    },
  });
}
