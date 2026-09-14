import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapSimklBehaviour,
  applyBehaviourSecondary,
} from "../../lib/provider-evidence/simkl-behaviour.ts";
import { isStubTitle } from "../../lib/intelligence/candidates/hydrate.ts";
import {
  sourceFamilyOf,
  independentFamiliesForTerm,
} from "../../lib/provider-evidence/source-family.ts";
import type { SemanticTerm } from "../../lib/provider-evidence/types.ts";
import {
  AI_EVIDENCE_CONTRACT,
  SEMANTIC_JUDGE_SYSTEM,
} from "../../lib/intelligence/ai/semantic-judge-prompt.ts";

describe("Simkl null vs zero drop-rate", () => {
  it("missing drop → null/null (unknown)", () => {
    const s = mapSimklBehaviour({ rating: 8 });
    assert.equal(s.dropRisk, null);
    assert.equal(s.completionLikelihood, null);
    assert.equal(s.hasBehaviourEvidence, false);
  });

  it("explicit 0 drop → dropRisk 0, completion 1", () => {
    const s = mapSimklBehaviour({ dropRate01: 0 });
    assert.equal(s.dropRisk, 0);
    assert.equal(s.completionLikelihood, 1);
    assert.equal(s.hasBehaviourEvidence, true);
  });

  it("missing behaviour does not change semantic primary score", () => {
    const primary = 0.77;
    const s = mapSimklBehaviour({});
    assert.equal(applyBehaviourSecondary(primary, s), primary);
  });
});

describe("stub title prevention", () => {
  it("rejects Indexed #id and empty", () => {
    assert.equal(isStubTitle("Indexed #1234"), true);
    assert.equal(isStubTitle(""), true);
    assert.equal(isStubTitle("Steins;Gate"), false);
  });
});

describe("source family", () => {
  it("jikan + mal_official = one family", () => {
    assert.equal(sourceFamilyOf("jikan"), "mal");
    assert.equal(sourceFamilyOf("mal_official"), "mal");
    const terms: SemanticTerm[] = [
      { name: "Drama", kind: "genre", source: "jikan", sourceFamily: "mal" },
      {
        name: "Drama",
        kind: "genre",
        source: "mal_official",
        sourceFamily: "mal",
      },
    ];
    assert.equal(independentFamiliesForTerm(terms, "Drama").length, 1);
  });
});

describe("AI evidence contract", () => {
  it("forbids model memory and score mutation", () => {
    assert.ok(AI_EVIDENCE_CONTRACT.includes("Use ONLY the supplied"));
    assert.ok(AI_EVIDENCE_CONTRACT.includes("Do not invent"));
    assert.ok(AI_EVIDENCE_CONTRACT.includes("Do not alter"));
  });

  it("SEMANTIC_JUDGE_SYSTEM incorporates canonical AI_EVIDENCE_CONTRACT", () => {
    assert.ok(SEMANTIC_JUDGE_SYSTEM.includes(AI_EVIDENCE_CONTRACT));
  });
});
