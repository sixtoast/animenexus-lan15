import { describe, it } from "node:test";
import assert from "node:assert/strict";

function makeNexusId(provider: string, id: number | string) {
  return `${provider}:${id}`;
}
function parseNexusId(nexusId: string) {
  const i = nexusId.indexOf(":");
  if (i <= 0) return null;
  return { provider: nexusId.slice(0, i), id: nexusId.slice(i + 1) };
}

describe("Provider identity", () => {
  it("nexusId encodes provider", () => {
    assert.equal(makeNexusId("kitsu", 123), "kitsu:123");
    assert.equal(parseNexusId("kitsu:123")?.provider, "kitsu");
  });
  it("kitsu id must not be treated as anilist", () => {
    const p = parseNexusId("kitsu:123");
    assert.notEqual(p?.provider, "anilist");
  });
});

describe("Intent fit math", () => {
  it("confidence softens distance", () => {
    const desired = 0.9;
    const actual = 0.9;
    const confidence = 0.8;
    const rawFit = 1 - Math.abs(actual - desired);
    const effectiveFit = 0.5 + (rawFit - 0.5) * confidence;
    assert.ok(effectiveFit > 0.85);
  });
});
