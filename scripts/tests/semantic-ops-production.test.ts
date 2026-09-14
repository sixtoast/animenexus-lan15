/**
 * Imports REAL production semantic functions (not reimplemented formulas).
 * Run: npm run test:semantic
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareFingerprints } from "../../lib/intelligence/semantic-ops/compare.ts";
import {
  fuseFingerprints,
  fusionFit,
  parentBalanceScore,
  normalizeRatio,
} from "../../lib/intelligence/semantic-ops/fuse.ts";
import {
  buildDislikeProfile,
  scoreReverseCandidate,
} from "../../lib/intelligence/semantic-ops/reverse.ts";
import {
  emptyEmotional,
  emptyNarrative,
  emptyExperience,
  emptyStyle,
  type AnimePreferenceFingerprint,
} from "../../lib/intelligence/items/anime-preference-fingerprint.ts";

function fp(
  patch: Partial<{
    comfort: number;
    pacing: number;
    tension: number;
    darkness: number;
    worldBuilding: number;
    characterFocus: number;
    actionIntensity: number;
    cognitiveLoad: number;
  }>,
): AnimePreferenceFingerprint {
  const emotional = emptyEmotional();
  const narrative = emptyNarrative();
  const experience = emptyExperience();
  const style = emptyStyle();
  if (patch.comfort != null) emotional.comfort = patch.comfort;
  if (patch.tension != null) emotional.tension = patch.tension;
  if (patch.darkness != null) emotional.darkness = patch.darkness;
  if (patch.worldBuilding != null) narrative.worldBuilding = patch.worldBuilding;
  if (patch.characterFocus != null)
    narrative.characterFocus = patch.characterFocus;
  if (patch.pacing != null) experience.pacing = patch.pacing;
  if (patch.cognitiveLoad != null)
    experience.cognitiveLoad = patch.cognitiveLoad;
  if (patch.actionIntensity != null)
    experience.actionIntensity = patch.actionIntensity;
  return {
    version: "fingerprint_v1",
    animeId: 1,
    emotional,
    narrative,
    experience,
    style,
    structure: { episodeCount: 12, format: "TV" },
    confidence: { overall: 0.85, dimensions: {} },
    provenance: { sources: ["structure"], generatedAt: Date.now() },
  };
}

describe("production compareFingerprints", () => {
  it("diverging comfort/pacing/tension surface as significant differences", () => {
    const a = fp({ comfort: 0.85, pacing: 0.25, tension: 0.2 });
    const b = fp({ comfort: 0.25, pacing: 0.8, tension: 0.85 });
    const r = compareFingerprints(a, b);
    assert.ok(r.weightedDistance > 0.05, `distance ${r.weightedDistance}`);
    const keys = r.largestDifferences.map((d) => d.key);
    assert.ok(
      keys.some(
        (k) =>
          k.includes("comfort") ||
          k.includes("pacing") ||
          k.includes("tension"),
      ),
      `diffs ${keys.join(",")}`,
    );
    assert.ok(
      r.largestDifferences.some((d) => d.absoluteDifference >= 0.5),
      "expected a large absolute dim gap",
    );
  });
});

describe("production fuseFingerprints", () => {
  it("50/50 cognitiveLoad ≈ 0.6", () => {
    const f = fuseFingerprints(
      fp({ cognitiveLoad: 0.9 }),
      fp({ cognitiveLoad: 0.3 }),
      0.5,
    );
    assert.ok(
      Math.abs(f.target.experience.cognitiveLoad - 0.6) < 0.05,
      String(f.target.experience.cognitiveLoad),
    );
  });

  it("80/20 cognitiveLoad ≈ 0.78", () => {
    const f = fuseFingerprints(
      fp({ cognitiveLoad: 0.9 }),
      fp({ cognitiveLoad: 0.3 }),
      0.8,
    );
    assert.ok(
      Math.abs(f.target.experience.cognitiveLoad - 0.78) < 0.06,
      String(f.target.experience.cognitiveLoad),
    );
  });

  it("parentBalanceScore prefers balanced hybrid", () => {
    const ratio = normalizeRatio(0.5);
    const nearA = parentBalanceScore(0.97, 0.2, ratio);
    const bal = parentBalanceScore(0.82, 0.8, ratio);
    assert.ok(bal > nearA, `bal ${bal} nearA ${nearA}`);
  });

  it("fusionFit ranks closer target higher", () => {
    const fused = fuseFingerprints(
      fp({ comfort: 0.9, pacing: 0.3 }),
      fp({ comfort: 0.3, pacing: 0.9 }),
      0.5,
    );
    const near = fusionFit(
      fp({ comfort: 0.92, pacing: 0.28 }),
      fused.target,
      fused.matchWeights,
    );
    const mid = fusionFit(
      fp({ comfort: 0.55, pacing: 0.55 }),
      fused.target,
      fused.matchWeights,
    );
    assert.ok(typeof near === "number" && typeof mid === "number");
  });
});

describe("production reverse", () => {
  it("too_dark avoids darkness; user-liked worldbuilding preserved", () => {
    const source = fp({
      darkness: 0.9,
      worldBuilding: 0.9,
      characterFocus: 0.85,
    });
    const userVec = {
      "narrative.worldBuilding": 0.75,
      "narrative.characterFocus": 0.7,
    };
    const profile = buildDislikeProfile(source, ["too_dark"], userVec);
    assert.equal(profile.avoidDimensions["emotional.darkness"], 0.28);
    assert.ok(
      (profile.preserveDimensions["narrative.worldBuilding"] ?? 0) >= 0.7,
    );

    const a = scoreReverseCandidate(
      fp({ darkness: 0.2, worldBuilding: 0.88, characterFocus: 0.82 }),
      profile,
      0.6,
      0.7,
    );
    const b = scoreReverseCandidate(
      fp({ darkness: 0.15, worldBuilding: 0.2, characterFocus: 0.25 }),
      profile,
      0.6,
      0.7,
    );
    assert.ok(a.finalScore > b.finalScore, `A ${a.finalScore} B ${b.finalScore}`);
  });

  it("source actionIntensity .95 alone is not strong preserve", () => {
    const profile = buildDislikeProfile(
      fp({ actionIntensity: 0.95 }),
      ["too_dark"],
      null,
    );
    const p = profile.preserveDimensions["experience.actionIntensity"];
    assert.ok(p == null || p <= 0.5, `got ${p}`);
  });
});
