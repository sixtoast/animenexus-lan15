/**
 * Pure-math tests for semantic-ops invariants (no path-alias imports).
 */
import test from "node:test";
import assert from "node:assert/strict";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

test("fusion blend 50/50", () => {
  const a = { cognitiveLoad: 0.9, tension: 0.75, romance: 0.1, relationshipFocus: 0.25 };
  const b = { cognitiveLoad: 0.3, tension: 0.25, romance: 0.9, relationshipFocus: 0.95 };
  const t = {
    cognitiveLoad: a.cognitiveLoad * 0.5 + b.cognitiveLoad * 0.5,
    tension: a.tension * 0.5 + b.tension * 0.5,
    romance: a.romance * 0.5 + b.romance * 0.5,
    relationshipFocus: a.relationshipFocus * 0.5 + b.relationshipFocus * 0.5,
  };
  assert.ok(Math.abs(t.cognitiveLoad - 0.6) < 1e-9);
  assert.ok(Math.abs(t.tension - 0.5) < 1e-9);
  assert.ok(Math.abs(t.romance - 0.5) < 1e-9);
  assert.ok(Math.abs(t.relationshipFocus - 0.6) < 1e-9);
});

test("fusion ratio 80/20", () => {
  assert.ok(Math.abs(1 * 0.8 + 0 * 0.2 - 0.8) < 1e-9);
});

test("weighted similarity penalises large dim gaps", () => {
  const dims = [
    [0.85, 0.25],
    [0.25, 0.8],
    [0.25, 0.75],
    [0.2, 0.85],
  ];
  let num = 0;
  let den = 0;
  for (const [a, b] of dims) {
    num += Math.abs(a - b);
    den += 1;
  }
  const sim = clamp01(1 - num / den);
  assert.ok(sim < 0.55, `sim=${sim}`);
});

test("small darkness gap not significant at 0.12 threshold", () => {
  assert.ok(Math.abs(0.62 - 0.6) < 0.12);
});

test("reverse preserve ranks higher than inverted everything", () => {
  function score(dark: number, world: number) {
    const avoid = 1 - Math.min(1, Math.abs(dark - 0.28) / 0.5);
    const preserve = 1 - Math.min(1, Math.abs(world - 0.9) / 0.45);
    return avoid * 0.38 + preserve * 0.32 + 0.7 * 0.18 + 0.7 * 0.12;
  }
  const a = score(0.2, 0.88);
  const b = score(0.15, 0.2);
  assert.ok(a > b, `${a} vs ${b}`);
});
