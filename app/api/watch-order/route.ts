import { NextRequest, NextResponse } from "next/server";
import { fetchAncestryGraph } from "@/lib/anilist-detail";
import { resolveFranchiseGraph } from "@/lib/franchise-resolver";
import { enrichJikanFranchise } from "@/lib/providers/jikan-franchise";

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

    // AniList supplies the franchise graph. Jikan/MAL is independent evidence
    // for exact airing dates, relation corroboration, and shared-character
    // evidence on Easter-egg leaves. It never creates recommendation edges.
    const enriched = await enrichJikanFranchise(graph.nodes, graph.edges, id, 28);

    const root = enriched.nodes.find((n) => n.id === id);
    const center = root
      ? {
          id: root.id,
          title: root.title,
          year: root.year == null ? undefined : Number(root.year),
          format: root.format,
          airedFrom: root.airedFrom,
          airedTo: root.airedTo,
        }
      : { id, title: "Current title" };

    const plan = resolveFranchiseGraph({
      center,
      nodes: enriched.nodes,
      edges: enriched.edges,
      sources: ["anilist", "jikan"],
    });

    return NextResponse.json({
      ...plan,
      graph: { nodes: enriched.nodes, edges: enriched.edges },
      chronology: {
        provider: "Jikan / MyAnimeList",
        enrichedNodes: enriched.enrichedNodes,
        corroboratedEdges: enriched.corroboratedEdges,
      },
      easterEggs: {
        provider: "AniList + Jikan / MyAnimeList",
        characterEvidence: enriched.characterEvidence,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve watch order",
      },
      { status: 502 },
    );
  }
}
