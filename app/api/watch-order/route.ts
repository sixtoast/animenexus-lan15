import { NextRequest, NextResponse } from "next/server";
import { fetchAncestryGraph } from "@/lib/anilist-detail";
import { resolveFranchiseGraph } from "@/lib/franchise-resolver";
import { enrichJikanChronology } from "@/lib/providers/jikan-chronology";

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
    // Jikan/MAL is secondary evidence for exact airing dates. AniList remains
    // authoritative for the relationship graph itself.
    const chronology = await enrichJikanChronology(graph.nodes, 36);
    const enrichedNodes = graph.nodes.map((node) => {
      const malId = node.idMal;
      const evidence = malId ? chronology.get(malId) : undefined;
      return evidence
        ? { ...node, airedFrom: evidence.airedFrom, airedTo: evidence.airedTo }
        : node;
    });

    const root = enrichedNodes.find((n) => n.id === id);
    const center = root
      ? { id: root.id, title: root.title, year: root.year == null ? undefined : Number(root.year), format: root.format }
      : { id, title: "Current title" };

    const plan = resolveFranchiseGraph({
      center,
      nodes: enrichedNodes,
      edges: graph.edges,
      sources: ["anilist"],
    });

    return NextResponse.json({
      ...plan,
      graph: { ...graph, nodes: enrichedNodes },
      chronology: {
        provider: "Jikan / MyAnimeList",
        enrichedNodes: chronology.size,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve watch order" },
      { status: 502 },
    );
  }
}
