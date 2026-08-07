import { NextRequest, NextResponse } from "next/server";
import { fetchUpcoming } from "@/lib/anilist-discover";

export async function GET(req: NextRequest) {
  const genre = req.nextUrl.searchParams.get("genre") || undefined;
  try {
    const page = await fetchUpcoming({ perPage: 24, genre });
    return NextResponse.json({ data: page.data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upcoming failed" },
      { status: 502 },
    );
  }
}
