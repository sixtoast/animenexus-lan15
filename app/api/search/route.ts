import { NextRequest, NextResponse } from "next/server";
import { searchAnime } from "@/lib/anilist";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const perPage = Math.min(
    20,
    parseInt(req.nextUrl.searchParams.get("perPage") || "8", 10) || 8,
  );
  if (q.trim().length < 2) {
    return NextResponse.json({ data: [] });
  }
  try {
    const page = await searchAnime(q.trim(), 1, perPage);
    return NextResponse.json({ data: page.data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 },
    );
  }
}
