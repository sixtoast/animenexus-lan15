/**
 * Jikan/MAL enrichment for the franchise graph.
 *
 * AniList remains the primary graph source. Jikan is used as independent
 * evidence for airing dates, relation corroboration, and shared-character
 * evidence on Easter-egg leaves.
 */

import type { GraphEdge, GraphNode } from "@/lib/types";
import { withProviderLimit } from "@/lib/provider-rate-limit";

type JikanFull = {
  data?: {
    mal_id?: number;
    title?: string;
    aired?: { from?: string | null; to?: string | null };
    relations?: Array<{
      relation?: string;
      entry?: Array<{
        mal_id?: number;
        type?: string;
        name?: string;
      }>;
    }>;
  };
};

type JikanCharacters = {
  data?: Array<{
    character?: { mal_id?: number; name?: string };
  }>;
};

export type JikanFranchiseEnrichment = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  enrichedNodes: number;
  corroboratedEdges: number;
  characterEvidence: number;
};

const RELATION_MAP: Record<string, string> = {
  "sequel": "SEQUEL",
  "prequel": "PREQUEL",
  "side story": "SIDE_STORY",
  "spin-off": "SPIN_OFF",
  "spin off": "SPIN_OFF",
  "alternative version": "ALTERNATIVE",
  "alternative version of": "ALTERNATIVE",
  "summary": "SUMMARY",
  "parent story": "PARENT",
  "full story": "FULL_STORY",
  "other": "OTHER",
  "adaptation": "OTHER",
};

function normaliseRelation(raw?: string): string {
  const value = (raw || "").trim().toLowerCase();
  return RELATION_MAP[value] || value.toUpperCase().replace(/\s+/g, "_") || "OTHER";
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await withProviderLimit("jikan", async () =>
      fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 600 },
      }),
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchFull(malId: number): Promise<JikanFull["data"] | null> {
  const json = await fetchJson<JikanFull>(
    `https://api.jikan.moe/v4/anime/${malId}/full`,
  );
  return json?.data || null;
}

async function fetchCharacters(malId: number): Promise<Set<number>> {
  const json = await fetchJson<JikanCharacters>(
    `https://api.jikan.moe/v4/anime/${malId}/characters`,
  );
  return new Set(
    (json?.data || [])
      .map((row) => row.character?.mal_id)
      .filter((id): id is number => Number.isInteger(id)),
  );
}

function edgeBetween(edges: GraphEdge[], a: number, b: number): GraphEdge | undefined {
  return edges.find(
    (edge) =>
      (edge.from === a && edge.to === b) ||
      (edge.from === b && edge.to === a),
  );
}

export async function enrichJikanFranchise(
  inputNodes: GraphNode[],
  inputEdges: GraphEdge[],
  rootId: number,
  limit = 28,
): Promise<JikanFranchiseEnrichment> {
  const nodes = inputNodes.map((node) => ({ ...node }));
  const edges = inputEdges.map((edge) => ({
    ...edge,
    sources: edge.sources ? [...edge.sources] : [],
  }));

  const malToNode = new Map<number, GraphNode>();
  for (const node of nodes) {
    if (Number.isInteger(node.idMal) && node.idMal! > 0) {
      malToNode.set(node.idMal!, node);
    }
  }

  const candidates = nodes
    .filter((node) => Number.isInteger(node.idMal) && Number(node.idMal) > 0)
    .slice(0, limit);

  const fullRows = await Promise.all(
    candidates.map(async (node) => ({
      node,
      data: await fetchFull(node.idMal!),
    })),
  );

  let corroboratedEdges = 0;
  let characterEvidence = 0;

  for (const { node, data } of fullRows) {
    if (!data) continue;

    if (data.aired?.from !== undefined) node.airedFrom = data.aired.from;
    if (data.aired?.to !== undefined) node.airedTo = data.aired.to;

    for (const relation of data.relations || []) {
      const type = normaliseRelation(relation.relation);
      for (const target of relation.entry || []) {
        const targetNode = target.mal_id ? malToNode.get(target.mal_id) : undefined;
        if (!targetNode) continue;

        const existing = edgeBetween(edges, node.id, targetNode.id);
        if (!existing) continue;

        if (!existing.sources) existing.sources = [];
        if (!existing.sources.includes("jikan")) existing.sources.push("jikan");

        const sameFamily = normaliseRelation(existing.label) === type;
        existing.confidence = Math.max(
          existing.confidence ?? 0,
          sameFamily ? 0.98 : 0.9,
        );
        existing.corroborated = true;
        corroboratedEdges += 1;

        const evidence = `Jikan/MAL relation: ${relation.relation || type}`;
        const targetEvidence = targetNode.relationEvidence || [];
        if (!targetEvidence.includes(evidence)) {
          targetNode.relationEvidence = [...targetEvidence, evidence];
        }
      }
    }
  }

  const root = nodes.find((node) => node.id === rootId);
  if (root && Number.isInteger(root.idMal) && root.idMal! > 0) {
    const rootCharacters = await fetchCharacters(root.idMal!);

    if (rootCharacters.size) {
      const eggNodes = nodes.filter((node) => node.layer === "easter_egg");
      const eggCharacters = await Promise.all(
        eggNodes
          .filter((node) => Number.isInteger(node.idMal) && node.idMal! > 0)
          .map(async (node) => ({
            node,
            characters: await fetchCharacters(node.idMal!),
          })),
      );

      for (const { node, characters } of eggCharacters) {
        const sharedCount = [...characters].filter((id) => rootCharacters.has(id));
        if (!sharedCount.length) continue;

        const evidence = node.relationEvidence || [];
        const detail = `Shared character confirmed by Jikan/MAL (${sharedCount.length} character${sharedCount.length === 1 ? "" : "s"}).`;
        if (!node.relationDetail?.startsWith("Shared character:")) {
          node.relationDetail = node.relationDetail
            ? `${node.relationDetail} ${detail}`
            : detail;
        }
        if (!evidence.includes(detail)) {
          node.relationEvidence = [...evidence, detail];
        }
        characterEvidence += 1;
      }
    }
  }

  return {
    nodes,
    edges,
    enrichedNodes: fullRows.filter((row) => Boolean(row.data)).length,
    corroboratedEdges,
    characterEvidence,
  };
}
