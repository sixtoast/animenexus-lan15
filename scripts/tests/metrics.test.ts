import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  recallAtK,
  precisionAtK,
  ndcgAtK,
  mrr,
  intraListDiversity,
  catalogueCoverage,
  meanAbsoluteCalibrationError,
  completionWeightedHitRate,
} from "../../lib/intelligence/evaluation/metrics.ts";

describe("ranking metrics", () => {
  const ranked = [
    { id: 1, score: 0.9 },
    { id: 2, score: 0.8 },
    { id: 3, score: 0.7 },
    { id: 4, score: 0.6 },
    { id: 5, score: 0.5 },
  ];
  const relevant = new Set([2, 4, 9]);

  it("recallAtK counts hits over relevant size", () => {
    assert.equal(recallAtK(ranked, relevant, 2), 1 / 3);
    assert.equal(recallAtK(ranked, relevant, 4), 2 / 3);
    assert.equal(recallAtK(ranked, new Set(), 5), 0);
  });

  it("precisionAtK counts hits over k", () => {
    assert.equal(precisionAtK(ranked, relevant, 4), 2 / 4);
  });

  it("ndcgAtK is 1 for perfect ordering of relevant set", () => {
    const perfect = [
      { id: 2, score: 1 },
      { id: 4, score: 0.9 },
      { id: 9, score: 0.8 },
    ];
    const rel = new Set([2, 4, 9]);
    assert.ok(ndcgAtK(perfect, rel, 3) > 0.99);
  });

  it("mrr returns reciprocal rank of first hit", () => {
    assert.equal(mrr(ranked, relevant), 1 / 2);
    assert.equal(mrr(ranked, new Set([5])), 1 / 5);
    assert.equal(mrr(ranked, new Set([99])), 0);
  });

  it("intraListDiversity is 0 for identical tags", () => {
    const items = [
      { id: 1, tags: ["Action"] },
      { id: 2, tags: ["Action"] },
      { id: 3, tags: ["Action"] },
    ];
    assert.equal(intraListDiversity(items, 3), 0);
  });

  it("intraListDiversity is high for disjoint tags", () => {
    const items = [
      { id: 1, tags: ["A"] },
      { id: 2, tags: ["B"] },
      { id: 3, tags: ["C"] },
    ];
    assert.ok(intraListDiversity(items, 3) > 0.9);
  });

  it("catalogueCoverage scales unique top-k by catalogue size", () => {
    assert.equal(catalogueCoverage(ranked, 100, 5), 1);
  });

  it("meanAbsoluteCalibrationError averages |p - y|", () => {
    const err = meanAbsoluteCalibrationError([
      { predicted: 0.8, outcome: 1 },
      { predicted: 0.2, outcome: 0 },
    ]);
    assert.ok(Math.abs(err - 0.2) < 1e-9);
  });

  it("completionWeightedHitRate rewards completed in top-k", () => {
    const rate = completionWeightedHitRate(ranked, new Set([1, 3]), 3);
    assert.equal(rate, 1);
  });
});
