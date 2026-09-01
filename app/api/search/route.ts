import { NextRequest, NextResponse } from "next/server";
import { searchAnime, fetchFiltered } from "@/lib/anilist";
import { parseIntentSearch } from "@/lib/intent-search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const perPage = Math.min(
    20,
    parseInt(req.nextUrl.searchParams.get("perPage") || "8", 10) || 8,
  );
  if (q.trim().length < 2) {
    return NextResponse.json({ data: [], parsed: null });
  }
  try {
    const parsed = parseIntentSearch(q.trim());
    let data;
    if (parsed.isIntentQuery && (parsed.filters.genre || parsed.filters.format)) {
      const page = await fetchFiltered(
        { ...parsed.filters, search: parsed.keyword || undefined },
        1,
        perPage,
      );
      data = page.data;
      if (data.length < 3 && parsed.keyword) {
        const page2 = await searchAnime(parsed.keyword, 1, perPage);
        const ids = new Set(data.map((a) => a.id));
        data = [...data, ...page2.data.filter((a) => !ids.has(a.id))].slice(
          0,
          perPage,
        );
      }
    } else {
      const page = await searchAnime(parsed.keyword || q.trim(), 1, perPage);
      data = page.data;
    }
    return NextResponse.json({
      data,
      parsed: {
        summary: parsed.summary,
        isIntentQuery: parsed.isIntentQuery,
        experienceSlug: parsed.experienceSlug,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 },
    );
  }
}
