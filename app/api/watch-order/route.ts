import { NextRequest, NextResponse } from "next/server";
import { fetchAncestryGraph } from "@/lib/anilist-detail";
import { resolveFranchiseGraph } from "@/lib/franchise-resolver";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const graph = await fetchAncestryGraph(id, {
      hopRecLimit: 0,
      maxNodes: 80,
    });
    const root = graph.nodes.find((n) => n.id === id);
    const center = root
      ? { id: root.id, title: root.title, year: root.year == null ? undefined : Number(root.year), format: root.format }
      : { id, title: "Current title" };

    const plan = resolveFranchiseGraph({
      center,
      nodes: graph.nodes,
      edges: graph.edges,
      sources: ["anilist"],
    });

    return NextResponse.json({ ...plan, graph });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve watch order" },
      { status: 502 },
    );
  }
}
