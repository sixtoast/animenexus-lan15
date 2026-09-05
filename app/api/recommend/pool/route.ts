import { NextResponse } from "next/server";
import {
  generateCandidatePool,
  poolToAnimeList,
} from "@/lib/recommend-candidates";
import type { WatchlistEntry } from "@/lib/types";

/**
 * POST { entries?: WatchlistEntry[], experienceSlug?: string }
 * Returns multi-source candidate anime list for client ranking.
 */
export async function POST(req: Request) {
  let body: {
    entries?: WatchlistEntry[];
    experienceSlug?: string;
    maxPool?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const entries = Array.isArray(body.entries) ? body.entries.slice(0, 200) : [];

  try {
    const pool = await generateCandidatePool({
      entries,
      experienceSlug: body.experienceSlug,
      perSource: 32,
      maxPool: body.maxPool ?? 280,
    });
    return NextResponse.json({
      version: pool.version,
      generatedAt: pool.generatedAt,
      count: pool.candidates.length,
      data: poolToAnimeList(pool),
      sources: pool.candidates.slice(0, 40).map((c) => ({
        id: c.anime.id,
        sources: c.sources,
        reason: c.reason,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Pool failed",
        data: [],
      },
      { status: 200 },
    );
  }
}
