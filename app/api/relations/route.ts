import { NextRequest, NextResponse } from "next/server";
import { fetchAncestryGraph, fetchRelationsOnly } from "@/lib/anilist-detail";

export async function GET(req: NextRequest) {
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const deep = req.nextUrl.searchParams.get("deep") !== "0";
  try {
    if (deep) {
      const graph = await fetchAncestryGraph(id, {
        hopRecLimit: 5,
        maxNodes: 36,
      });
      return NextResponse.json(graph);
    }
    const data = await fetchRelationsOnly(id);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 502 },
    );
  }
}
