import { NextRequest, NextResponse } from "next/server";
import { fetchByGenres } from "@/lib/anilist-discover";

export async function GET(req: NextRequest) {
  const genres =
    req.nextUrl.searchParams.get("genres")?.split(",").map((g) => g.trim()).filter(Boolean) ||
    [];
  const exclude =
    req.nextUrl.searchParams
      .get("exclude")
      ?.split(",")
      .map((x) => parseInt(x, 10))
      .filter((n) => !Number.isNaN(n)) || [];
  const mode = req.nextUrl.searchParams.get("mode") || "score";
  const sort =
    mode === "popular"
      ? ["POPULARITY_DESC"]
      : mode === "trending"
        ? ["TRENDING_DESC"]
        : ["SCORE_DESC", "POPULARITY_DESC"];

  if (!genres.length) {
    return NextResponse.json({ data: [] });
  }
  try {
    const page = await fetchByGenres(genres, {
      perPage: 18,
      sort,
      excludeIds: exclude,
    });
    return NextResponse.json({ data: page.data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Recommend failed" },
      { status: 502 },
    );
  }
}
