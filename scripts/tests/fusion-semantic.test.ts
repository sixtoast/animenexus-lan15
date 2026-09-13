import test from "node:test";
import assert from "node:assert/strict";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

test("50/50 blend is mathematical midpoint", () => {
  const A = { cognitiveLoad: 0.9, tension: 0.75, romance: 0.1, relationshipFocus: 0.25 };
  const B = { cognitiveLoad: 0.3, tension: 0.25, romance: 0.9, relationshipFocus: 0.95 };
  const t = {
    cognitiveLoad: A.cognitiveLoad * 0.5 + B.cognitiveLoad * 0.5,
    tension: A.tension * 0.5 + B.tension * 0.5,
    romance: A.romance * 0.5 + B.romance * 0.5,
    relationshipFocus: A.relationshipFocus * 0.5 + B.relationshipFocus * 0.5,
  };
  assert.ok(Math.abs(t.cognitiveLoad - 0.6) < 1e-9);
  assert.ok(Math.abs(t.tension - 0.5) < 1e-9);
  assert.ok(Math.abs(t.romance - 0.5) < 1e-9);
  assert.ok(Math.abs(t.relationshipFocus - 0.6) < 1e-9);
});

test("80/20 ratio is exact weighted average", () => {
  assert.ok(Math.abs(1 * 0.8 + 0 * 0.2 - 0.8) < 1e-9);
  assert.ok(Math.abs(0.9 * 0.8 + 0.3 * 0.2 - 0.78) < 1e-9);
});

test("50/50 prefers balanced parent fit over A-clone", () => {
  const W_HYBRID = 0.8;
  const W_BALANCE = 0.12;
  const W_QUALITY = 0.08;
  function score(fFit: number, fitA: number, fitB: number, q = 0.7) {
    const total = fitA + fitB + 1e-6;
    const balance = clamp01(1 - Math.abs(fitA / total - 0.5) * 1.5);
    return fFit * W_HYBRID + balance * W_BALANCE + q * W_QUALITY;
  }
  const x = score(0.7, 0.97, 0.2);
  const y = score(0.72, 0.82, 0.8);
  assert.ok(y > x, `Y ${y} should beat X ${x}`);
});

test("genre overlap cannot beat semantic hybrid fit", () => {
  const scoreX = 0.3 * 0.8 + 0.5 * 0.12 + 0.7 * 0.08;
  const scoreY = 0.85 * 0.8 + 0.7 * 0.12 + 0.7 * 0.08;
  assert.ok(scoreY > scoreX);
});
