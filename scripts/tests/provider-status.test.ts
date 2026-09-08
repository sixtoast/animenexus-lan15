import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getOptionalProviderStatus } from "../../lib/provider-status.ts";

describe("provider-status snapshot", () => {
  it("returns catalog providers including anilist and jikan", () => {
    const rows = getOptionalProviderStatus();
    assert.ok(Array.isArray(rows));
    assert.ok(rows.length >= 5);
    const ids = new Set(rows.map((r) => r.id));
    assert.ok(ids.has("anilist"));
    assert.ok(ids.has("jikan"));
    for (const r of rows) {
      assert.equal(typeof r.label, "string");
      assert.equal(typeof r.configured, "boolean");
    }
  });

  it("never exposes secret values in notes", () => {
    const rows = getOptionalProviderStatus();
    const blob = JSON.stringify(rows);
    assert.equal(blob.includes("sk_"), false);
    assert.equal(blob.includes("Bearer"), false);
  });
});
