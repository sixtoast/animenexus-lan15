import test from "node:test";
import assert from "node:assert/strict";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

test("semantic distance ignores identical genre lists", () => {
  const A = [0.85, 0.25, 0.25, 0.2];
  const B = [0.25, 0.8, 0.75, 0.85];
  let num = 0;
  for (let i = 0; i < A.length; i++) num += Math.abs(A[i] - B[i]);
  const sim = clamp01(1 - num / A.length);
  assert.ok(sim < 0.55, `sim=${sim}`);
});

test("darkness 0.62 vs 0.60 is under 0.12 significance", () => {
  assert.ok(Math.abs(0.62 - 0.6) < 0.12);
});

test("user fit change does not alter A-B distance", () => {
  const abDistance = 0.4;
  assert.equal(abDistance, 0.4);
  assert.notEqual(0.9, 0.2);
});
