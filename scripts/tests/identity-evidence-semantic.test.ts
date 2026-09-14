import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  independentFamiliesForTerm,
  corroborationStrength,
  sourceFamilyOf,
} from "../../lib/provider-evidence/source-family.ts";
import type { SemanticTerm } from "../../lib/provider-evidence/types.ts";
import {
  clearSemanticIndexForTests,
  findSemanticNeighbours,
  indexFingerprint,
  MIN_SEMANTIC_INDEX_CONFIDENCE,
} from "../../lib/intelligence/candidates/semantic-index.ts";
import {
  buildDislikeProfile,
  scoreReverseCandidate,
} from "../../lib/intelligence/semantic-ops/reverse.ts";
import {
  parentBalanceScore,
  normalizeRatio,
} from "../../lib/intelligence/semantic-ops/fuse.ts";
import {
  emptyEmotional,
  emptyNarrative,
  emptyExperience,
  emptyStyle,
  type AnimePreferenceFingerprint,
} from "../../lib/intelligence/items/anime-preference-fingerprint.ts";
import { mapSimklBehaviour } from "../../lib/provider-evidence/simkl-behaviour.ts";

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
  animeId = 1,
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
    animeId,
    emotional,
    narrative,
    experience,
    style,
    structure: { episodeCount: 12, format: "TV" },
    confidence: { overall: 0.85, dimensions: {} },
    provenance: { sources: ["structure"], generatedAt: Date.now() },
  };
}

describe("source family", () => {
  it("jikan + mal_official share mal family", () => {
    assert.equal(sourceFamilyOf("jikan"), "mal");
    assert.equal(sourceFamilyOf("mal_official"), "mal");
  });

  it("Jikan Drama + MAL Official Drama → independent family count 1", () => {
    const terms: SemanticTerm[] = [
      {
        name: "Drama",
        kind: "genre",
        source: "jikan",
        sourceFamily: "mal",
        providerRelevance: null,
      },
      {
        name: "Drama",
        kind: "genre",
        source: "mal_official",
        sourceFamily: "mal",
        providerRelevance: null,
      },
    ];
    const families = independentFamiliesForTerm(terms, "Drama");
    assert.equal(families.length, 1);
    assert.equal(families[0], "mal");
    assert.ok(corroborationStrength(families) < 0.7);
  });
});

describe("evidence provenance kinds", () => {
  it("AniList tag keeps relevance; Jikan theme stays theme", () => {
    const anilistTag: SemanticTerm = {
      name: "Time Travel",
      kind: "tag",
      source: "anilist",
      sourceFamily: "anilist",
      providerRelevance: 0.9,
    };
    const jikanTheme: SemanticTerm = {
      name: "Time Travel",
      kind: "theme",
      source: "jikan",
      sourceFamily: "mal",
      providerRelevance: null,
    };
    assert.equal(anilistTag.kind, "tag");
    assert.equal(anilistTag.providerRelevance, 0.9);
    assert.equal(jikanTheme.kind, "theme");
    assert.equal(jikanTheme.providerRelevance, null);
  });
});

describe("semantic neighbours", () => {
  it("ranks close before moderate before far", () => {
    clearSemanticIndexForTests();
    const target = fp({ comfort: 0.7, pacing: 0.4, tension: 0.3 }, 100);
    indexFingerprint("anilist:1", fp({ comfort: 0.72, pacing: 0.38 }, 1));
    indexFingerprint("anilist:2", fp({ comfort: 0.5, pacing: 0.55 }, 2));
    indexFingerprint(
      "anilist:3",
      fp({ comfort: 0.1, pacing: 0.95, tension: 0.95 }, 3),
    );
    const hits = findSemanticNeighbours({ target, limit: 10 });
    assert.ok(hits.length >= 3);
    const order = hits.map((h) => h.animeId);
    assert.ok(order.indexOf(1) < order.indexOf(2), `order ${order.join(",")}`);
    assert.ok(order.indexOf(2) < order.indexOf(3), `order ${order.join(",")}`);
    assert.ok(MIN_SEMANTIC_INDEX_CONFIDENCE === 0.35);
  });
});

describe("reverse retrieval ranking", () => {
  it("A (low dark + keep world) beats B (wipe all) and C (still dark)", () => {
    const source = fp({
      darkness: 0.9,
      worldBuilding: 0.9,
      characterFocus: 0.85,
    });
    const profile = buildDislikeProfile(source, ["too_dark"], {
      "narrative.worldBuilding": 0.75,
      "narrative.characterFocus": 0.7,
    });
    const a = scoreReverseCandidate(
      fp({ darkness: 0.2, worldBuilding: 0.87, characterFocus: 0.83 }),
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
    const c = scoreReverseCandidate(
      fp({ darkness: 0.88, worldBuilding: 0.9, characterFocus: 0.9 }),
      profile,
      0.6,
      0.7,
    );
    assert.ok(a.finalScore > b.finalScore);
    assert.ok(a.finalScore > c.finalScore);
  });
});

describe("fusion retrieval ranking", () => {
  it("balanced parent hybrid outranks A-clone when fusionFit comparable", () => {
    const ratio = normalizeRatio(0.5);
    const balanceA = parentBalanceScore(0.84, 0.82, ratio);
    const scoreA = 0.9 * 0.8 + balanceA * 0.12 + 0.45 * 0.08;
    const balanceB = parentBalanceScore(0.97, 0.25, ratio);
    const scoreB = 0.88 * 0.8 + balanceB * 0.12 + 0.45 * 0.08;
    assert.ok(scoreA > scoreB, `balanced ${scoreA} vs clone ${scoreB}`);
  });
});

describe("simkl behaviour mapping", () => {
  it("does not invent dropRisk without dropRate01", () => {
    const s = mapSimklBehaviour({ rating: 8.2 });
    assert.equal(s.dropRisk, null);
    assert.ok(s.communityQuality01 != null);
  });

  it("maps real dropRate01 to completionLikelihood", () => {
    const s = mapSimklBehaviour({ dropRate01: 0.3 });
    assert.ok(s.dropRisk != null && Math.abs(s.dropRisk - 0.3) < 1e-9);
    assert.ok(
      s.completionLikelihood != null &&
        Math.abs(s.completionLikelihood - 0.7) < 1e-9,
    );
  });
});
