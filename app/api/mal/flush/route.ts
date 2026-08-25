import { NextRequest, NextResponse } from "next/server";
import { getMalAccessToken, malUpdateAnimeList } from "@/lib/mal-oauth";

export const runtime = "nodejs";

type QueueItem = {
  malId?: number;
  status?: string;
  progress?: number;
  score?: number;
};

/**
 * Client posts pending queue items with malId.
 * Local watchlist is never rolled back on failure.
 */
export async function POST(req: NextRequest) {
  const token = await getMalAccessToken();
  if (!token) {
    return NextResponse.json(
      { flushed: 0, remaining: 0, reason: "not_connected" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    items?: QueueItem[];
  } | null;
  const items = (body?.items || []).filter((i) => i.malId && i.malId > 0);

  let flushed = 0;
  const failed: number[] = [];

  for (const item of items.slice(0, 40)) {
    try {
      const ok = await malUpdateAnimeList({
        malId: item.malId!,
        status: item.status,
        progress: item.progress,
        score: item.score,
      });
      if (ok) flushed += 1;
      else failed.push(item.malId!);
    } catch {
      failed.push(item.malId!);
    }
  }

  return NextResponse.json({
    flushed,
    failed,
    remaining: failed.length,
  });
}
