import { NextRequest, NextResponse } from "next/server";
import { fetchByGenres } from "@/lib/anilist-discover";
import { fetchDiscover } from "@/lib/anilist";

/**
 * Candidate discovery for tools (fusion, reverse, etc.).
 * - With genres: genre-filtered AniList page
 * - Without genres: global discover feed (popular / score / trending)
 */
export async function GET(req: NextRequest) {
  const genres =
    req.nextUrl.searchParams
      .get("genres")
      ?.split(",")
      .map((g) => g.trim())
      .filter(Boolean) || [];
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

  try {
    if (genres.length) {
      const page = await fetchByGenres(genres, {
        perPage: 24,
        sort,
        excludeIds: exclude,
      });
      return NextResponse.json({ data: page.data });
    }

    // No genres → discover feed so fusion/reverse always get a pool
    const feed =
      mode === "popular"
        ? "popular"
        : mode === "trending"
          ? "trending"
          : "top";
    const page = await fetchDiscover(feed, 1, 40, "exclude");
    let data = page.data || [];
    if (exclude.length) {
      const ban = new Set(exclude);
      data = data.filter((a) => !ban.has(a.id));
    }
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Recommend failed" },
      { status: 502 },
    );
  }
}
