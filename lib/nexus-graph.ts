/**
 * AnimeNexus canonical relationship engine.
 *
 * Provider adapters produce GraphNode / GraphEdge records; this layer decides
 * identity, evidence, relationship family and safe traversal semantics.
 */
import type { GraphEdge, GraphNode } from "./types";
import { normalizeRelationType } from "./relation-merge";

export type NexusRelationship = GraphEdge & {
  id: string;
  directed: boolean;
};

export type NexusGraph = {
  rootId: number;
  nodes: GraphNode[];
  relationships: NexusRelationship[];
  official: NexusRelationship[];
  recommendations: NexusRelationship[];
  byNode: Record<number, NexusRelationship[]>;
  stats: { nodes: number; officialEdges: number; recommendationEdges: number; corroboratedEdges: number; uncertainEdges: number };
};

export function relationFamily(raw?: string): NexusRelationship["family"] {
  const t = normalizeRelationType(raw || "OTHER");
  if (["SEQUEL", "PREQUEL", "PARENT", "FULL_STORY"].includes(t)) return "mainline";
  if (t === "SIDE_STORY" || t === "SPIN_OFF") return "side_story";
  if (t === "ALTERNATIVE") return "alternative";
  if (t === "SUMMARY") return "summary";
  if (t === "RECOMMENDED") return "recommendation";
  return "other";
}

export function canonicalRelationship(e: GraphEdge): NexusRelationship {
  const label = normalizeRelationType(e.label || "OTHER");
  const sources = [...new Set(e.sources || [])];
  const confidence = e.confidence == null ? (e.kind === "official" ? 0.9 : 0.45) : e.confidence;
  return {
    ...e,
    id: e.kind + ":" + e.from + ">" + e.to + ":" + label,
    label,
    sources,
    confidence,
    corroborated: e.corroborated ?? sources.length > 1,
    family: e.family ?? relationFamily(label),
    directed: e.kind === "official",
  };
}

export function buildNexusGraph(rootId: number, nodes: GraphNode[], edges: GraphEdge[]): NexusGraph {
  const nodeMap = new Map<number, GraphNode>();
  for (const n of nodes) {
    const current = nodeMap.get(n.id);
    if (!current || (current.layer === "recommended" && n.layer === "official")) nodeMap.set(n.id, n);
  }
  const edgeMap = new Map<string, NexusRelationship>();
  for (const raw of edges) {
    const e = canonicalRelationship(raw);
    const key = e.kind === "official"
      ? "official:" + e.from + ">" + e.to + ":" + e.label
      : "recommended:" + Math.min(e.from, e.to) + "-" + Math.max(e.from, e.to);
    const existing = edgeMap.get(key);
    if (!existing) { edgeMap.set(key, e); continue; }
    const sources = [...new Set([...(existing.sources || []), ...(e.sources || [])])];
    edgeMap.set(key, { ...existing, sources, corroborated: sources.length > 1 || existing.corroborated || e.corroborated, confidence: Math.max(existing.confidence ?? 0, e.confidence ?? 0) });
  }
  const relationships = [...edgeMap.values()];
  const official = relationships.filter((e) => e.kind === "official");
  const recommendations = relationships.filter((e) => e.kind === "recommended");
  const byNode: Record<number, NexusRelationship[]> = {};
  for (const e of relationships) { (byNode[e.from] ||= []).push(e); (byNode[e.to] ||= []).push(e); }
  return { rootId, nodes: [...nodeMap.values()], relationships, official, recommendations, byNode,
    stats: { nodes: nodeMap.size, officialEdges: official.length, recommendationEdges: recommendations.length, corroboratedEdges: relationships.filter((e) => e.corroborated).length, uncertainEdges: relationships.filter((e) => (e.confidence ?? 0) < 0.8).length } };
}

export function isMainlineRelationship(e: GraphEdge): boolean { return relationFamily(e.label) === "mainline"; }
export function isOptionalRelationship(e: GraphEdge): boolean {
  const family = relationFamily(e.label);
  return family === "side_story" || family === "alternative" || family === "summary";
}