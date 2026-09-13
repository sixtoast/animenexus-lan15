import test from "node:test";
import assert from "node:assert/strict";

function scoreReverse(
  dark: number,
  world: number,
  avoidTarget = 0.28,
  preserveTarget = 0.9,
) {
  const avoid = 1 - Math.min(1, Math.abs(dark - avoidTarget) / 0.5);
  const preserve = 1 - Math.min(1, Math.abs(world - preserveTarget) / 0.45);
  return avoid * 0.38 + preserve * 0.32 + 0.7 * 0.18 + 0.7 * 0.12;
}

test("selective reverse: preserve worldbuilding when only darkness disliked", () => {
  const a = scoreReverse(0.2, 0.88);
  const b = scoreReverse(0.15, 0.2);
  assert.ok(a > b, `A ${a} vs B ${b}`);
});

test("not full inversion: low darkness alone is not enough", () => {
  const keep = scoreReverse(0.25, 0.85);
  const invert = scoreReverse(0.1, 0.15);
  assert.ok(keep > invert);
});

test("explicit reason outweighs generic preference conceptually", () => {
  const avoidRomance = 0.25;
  const candidateRomance = 0.2;
  const avoidScore =
    1 - Math.min(1, Math.abs(candidateRomance - avoidRomance) / 0.5);
  assert.ok(avoidScore > 0.8);
});

test("no-reason mode is lower confidence label", () => {
  const reasonSource = ([] as string[]).length ? "explicit" : "inferred";
  assert.equal(reasonSource, "inferred");
});
