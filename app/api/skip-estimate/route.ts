import { NextRequest, NextResponse } from "next/server";
import { estimateAverageSkipSeconds } from "@/lib/providers/aniskip";

export const runtime = "nodejs";

/**
 * GET ?malId=123&episodes=12
 * Returns average OP/ED/recap seconds per episode from AniSkip samples.
 */
export async function GET(req: NextRequest) {
  const malId = parseInt(req.nextUrl.searchParams.get("malId") || "0", 10);
  const episodes = Math.min(
    48,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("episodes") || "12", 10) || 12),
  );

  if (!malId || malId < 1) {
    return NextResponse.json({
      op: 0,
      ed: 0,
      recap: 0,
      sampled: 0,
      note: "MAL id required",
    });
  }

  try {
    // Sample first, mid, late episodes
    const nums = [
      1,
      Math.max(2, Math.floor(episodes / 2)),
      Math.max(3, episodes),
      Math.max(4, Math.floor(episodes * 0.25)),
      Math.max(5, Math.floor(episodes * 0.75)),
    ];
    const avg = await estimateAverageSkipSeconds(malId, nums);
    return NextResponse.json({
      ...avg,
      source: "aniskip",
    });
  } catch (e) {
    return NextResponse.json(
      {
        op: 0,
        ed: 0,
        recap: 0,
        sampled: 0,
        error: e instanceof Error ? e.message : "skip estimate failed",
      },
      { status: 502 },
    );
  }
}
