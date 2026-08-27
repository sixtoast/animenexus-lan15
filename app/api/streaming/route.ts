import { NextRequest, NextResponse } from "next/server";
import { identityFromAnime } from "@/lib/anime-identity";
import { fetchAnimeById } from "@/lib/anilist";
import {
  getStreamingAvailability,
  isWatchmodeConfigured,
  partitionAvailability,
} from "@/lib/providers/watchmode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isWatchmodeConfigured()) {
    return NextResponse.json({
      configured: false,
      availability: [],
      country: null,
      message: "Watchmode not configured (WATCHMODE_API_KEY).",
    });
  }

  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  const region = (req.nextUrl.searchParams.get("region") || "US")
    .toUpperCase()
    .slice(0, 2);
  const titleParam = req.nextUrl.searchParams.get("title") || undefined;

  if (!id || id < 1) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const anime = await fetchAnimeById(id);
    if (!anime) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const identity = identityFromAnime(anime);
    const result = await getStreamingAvailability({
      identity,
      title: titleParam || anime.title,
      year: anime.year,
      country: region.length === 2 ? region : "US",
    });
    const { stream, rentOrBuy } = partitionAvailability(result.availability);
    return NextResponse.json({
      configured: true,
      country: result.country,
      watchmodeId: result.watchmodeId ?? null,
      availability: result.availability,
      stream,
      rentOrBuy,
    });
  } catch (e) {
    return NextResponse.json(
      {
        configured: true,
        error: e instanceof Error ? e.message : "streaming failed",
        availability: [],
      },
      { status: 200 },
    );
  }
}
