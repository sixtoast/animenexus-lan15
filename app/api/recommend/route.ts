import { NextRequest, NextResponse } from "next/server";
import { fetchByGenres } from "@/lib/anilist-discover";
import { fetchDiscover } from "@/lib/anilist";
import { shikiDiscover } from "@/lib/providers/shikimori";
import { staticDiscover } from "@/lib/providers/static-catalog";
import { malOfficialDiscover } from "@/lib/providers/mal-official";
import { simklDiscoverAnime } from "@/lib/providers/simkl";

/** Multi-source candidate discovery. AniList preferred but not required. */
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

  const ban = new Set(exclude);
  const filterEx = <T extends { id: number }>(list: T[]) =>
    list.filter((a) => !ban.has(a.id));

  if (genres.length) {
    try {
      const page = await fetchByGenres(genres, {
        perPage: 24,
        sort,
        excludeIds: exclude,
      });
      if (page.data?.length) {
        return NextResponse.json({ data: page.data, source: "anilist_genres" });
      }
    } catch {
      /* fall through */
    }
  }

  const feed =
    mode === "popular"
      ? "popular"
      : mode === "trending"
        ? "trending"
        : "top";

  try {
    const page = await fetchDiscover(feed, 1, 40, "exclude");
    const data = filterEx(page.data || []);
    if (data.length) {
      return NextResponse.json({ data, source: "anilist_discover" });
    }
  } catch {
    /* fall through */
  }

  try {
    const shikiFeed = mode === "score" || mode === "top" ? "top" : "popular";
    const page = await shikiDiscover(
      (shikiFeed === "top" ? "top" : "popular") as "popular" | "top",
      1,
      40,
    );
    const data = filterEx(page.data || []);
    if (data.length) {
      return NextResponse.json({ data, source: "shikimori" });
    }
  } catch {
    /* fall through */
  }

  try {
    const page = await malOfficialDiscover(
      (mode === "score" || mode === "top" ? "top" : "popular") as
        | "popular"
        | "top",
      1,
      40,
    );
    const data = filterEx(page.data || []);
    if (data.length) {
      return NextResponse.json({ data, source: "mal_official" });
    }
  } catch {
    /* fall through */
  }

  try {
    const page = await simklDiscoverAnime(
      (mode === "trending" ? "trending" : "popular") as "popular" | "trending",
      1,
      40,
    );
    const data = filterEx(page.data || []);
    if (data.length) {
      return NextResponse.json({ data, source: "simkl" });
    }
  } catch {
    /* fall through */
  }

  try {
    const page = await staticDiscover(
      feed as "popular" | "top" | "trending",
      1,
      40,
    );
    const data = filterEx(page.data || []);
    return NextResponse.json({ data, source: "static_catalog" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Recommend failed", data: [] },
      { status: 502 },
    );
  }
}
