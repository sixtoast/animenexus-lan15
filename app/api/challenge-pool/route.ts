import { NextResponse } from "next/server";
import { fetchDiscover } from "@/lib/anilist";

export async function GET() {
  try {
    const page = await fetchDiscover("popular", 1, 40, "exclude");
    return NextResponse.json({ data: page.data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pool failed" },
      { status: 502 },
    );
  }
}
