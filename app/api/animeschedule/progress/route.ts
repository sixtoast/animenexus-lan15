import { NextResponse } from "next/server";
import {
  getAnimeScheduleAccessToken,
  updateAnimeScheduleListEntry,
} from "@/lib/animeschedule-oauth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = await getAnimeScheduleAccessToken();
  if (!token) return NextResponse.json({ error: "Connect AnimeSchedule first." }, { status: 401 });

  try {
    const body = await req.json() as { route?: string; episodesSeen?: number };
    const route = String(body.route || "").trim();
    const episodesSeen = Number(body.episodesSeen);
    if (!route || !Number.isFinite(episodesSeen) || episodesSeen < 0) {
      return NextResponse.json({ error: "route and a valid episodesSeen are required." }, { status: 400 });
    }

    const updated = await updateAnimeScheduleListEntry(token, route, {
      episodesSeen: Math.floor(episodesSeen),
      listStatus: "watching",
    });
    if (!updated) return NextResponse.json({ error: "AnimeSchedule rejected the progress update." }, { status: 409 });
    return NextResponse.json({ ok: true, entry: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Progress update failed." }, { status: 500 });
  }
}
