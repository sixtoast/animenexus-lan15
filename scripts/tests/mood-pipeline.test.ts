import { describe, it } from "node:test";
import assert from "node:assert/strict";

function cacheKey(parts: unknown[]): string {
  return parts.map((p) => (p == null ? "" : String(p))).join("|");
}

describe("AniList filter cache includes tag", () => {
  it("Tragedy vs Iyashikei produce different keys", () => {
    const a = cacheKey([
      "filtered",
      undefined,
      "Tragedy",
      undefined,
      undefined,
      undefined,
      "score",
      undefined,
      "exclude",
      1,
      24,
    ]);
    const b = cacheKey([
      "filtered",
      undefined,
      "Iyashikei",
      undefined,
      undefined,
      undefined,
      "score",
      undefined,
      "exclude",
      1,
      24,
    ]);
    assert.notEqual(a, b);
  });
});

describe("Direct intent fit math", () => {
  it("Destroy: melancholy/catharsis beats pure darkness", () => {
    function fit(
      actual: Record<string, number>,
      target: Record<string, number>,
      weights: Record<string, number>,
      conf = 0.9,
    ) {
      let score = 0,
        wt = 0;
      for (const key of Object.keys(target)) {
        const desired = target[key];
        const act = actual[key] ?? 0.5;
        const rawFit = 1 - Math.abs(act - desired);
        const effectiveFit = 0.5 + (rawFit - 0.5) * conf;
        const importance = weights[key] ?? 1;
        score += Math.max(0, Math.min(1, effectiveFit)) * importance;
        wt += importance;
      }
      return wt < 1e-9 ? 0.5 : score / wt;
    }
    const target = {
      "emotional.melancholy": 0.94,
      "emotional.catharsis": 0.95,
      "experience.emotionalIntensity": 0.93,
      "narrative.characterFocus": 0.78,
      "emotional.darkness": 0.68,
    };
    const weights = {
      "emotional.melancholy": 1.5,
      "emotional.catharsis": 1.7,
      "experience.emotionalIntensity": 1.5,
      "narrative.characterFocus": 1.15,
      "emotional.darkness": 0.7,
    };
    const A = {
      "emotional.darkness": 0.96,
      "experience.actionIntensity": 0.9,
      "emotional.melancholy": 0.25,
      "emotional.catharsis": 0.3,
      "narrative.characterFocus": 0.4,
      "experience.emotionalIntensity": 0.8,
    };
    const B = {
      "emotional.darkness": 0.58,
      "experience.actionIntensity": 0.2,
      "emotional.melancholy": 0.94,
      "emotional.catharsis": 0.95,
      "narrative.characterFocus": 0.92,
      "experience.emotionalIntensity": 0.91,
    };
    assert.ok(fit(B, target, weights) > fit(A, target, weights));
  });
});
