import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildNexusGraph, canonicalRelationship, relationFamily } from "../../lib/nexus-graph.ts";

describe("Nexus relationship engine", () => {
  it("preserves direction so prequel/sequel edges cannot collapse into one", () => {
    const a = canonicalRelationship({ from: 1, to: 2, kind: "official", label: "SEQUEL" });
    const b = canonicalRelationship({ from: 2, to: 1, kind: "official", label: "PREQUEL" });
    assert.notEqual(a.id, b.id);
  });

  it("classifies optional franchise material separately", () => {
    assert.equal(relationFamily("SIDE_STORY"), "side_story");
    assert.equal(relationFamily("ALTERNATIVE VERSION"), "alternative");
    assert.equal(relationFamily("SUMMARY"), "summary");
    assert.equal(relationFamily("SEQUEL"), "mainline");
  });

  it("upgrades a recommended node when an official edge exists", () => {
    const graph = buildNexusGraph(1, [
      { id: 1, title: "Root", relationType: "ROOT", layer: "official" },
      { id: 2, title: "Sequel", relationType: "SEQUEL", layer: "recommended" },
      { id: 2, title: "Sequel", relationType: "SEQUEL", layer: "official" },
    ], [
      { from: 1, to: 2, kind: "recommended", label: "RECOMMENDED" },
      { from: 1, to: 2, kind: "official", label: "SEQUEL", sources: ["anilist"], confidence: 1 },
    ]);
    assert.equal(graph.nodes.find((n) => n.id === 2)?.layer, "official");
    assert.equal(graph.stats.officialEdges, 1);
    assert.equal(graph.stats.recommendationEdges, 1);
  });

  it("corroborates duplicate provider attestations instead of duplicating edges", () => {
    const graph = buildNexusGraph(1, [
      { id: 1, title: "Root", relationType: "ROOT" },
      { id: 2, title: "Sequel", relationType: "SEQUEL" },
    ], [
      { from: 1, to: 2, kind: "official", label: "SEQUEL", sources: ["anilist"], confidence: 1 },
      { from: 1, to: 2, kind: "official", label: "SEQUEL", sources: ["anidb"], confidence: 0.9 },
    ]);
    assert.equal(graph.official.length, 1);
    assert.equal(graph.official[0].corroborated, true);
    assert.deepEqual(graph.official[0].sources.sort(), ["anidb", "anilist"]);
  });
});
