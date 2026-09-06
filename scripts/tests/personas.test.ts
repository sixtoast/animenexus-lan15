import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SYNTHETIC_PERSONAS,
  getPersona,
} from "../../lib/intelligence/evaluation/personas.ts";

describe("synthetic personas", () => {
  it("exports at least 5 personas with entries", () => {
    assert.ok(SYNTHETIC_PERSONAS.length >= 5);
    for (const p of SYNTHETIC_PERSONAS) {
      assert.ok(p.id);
      assert.ok(p.label);
      assert.ok(Array.isArray(p.entries));
      assert.ok(p.entries.every((e) => e.addedAt && e.updatedAt));
    }
  });

  it("getPersona resolves by id", () => {
    assert.ok(getPersona("psychological_specialist"));
    assert.equal(getPersona("nope"), undefined);
  });

  it("long_series_dropper has dropped long shows", () => {
    const p = getPersona("long_series_dropper")!;
    const dropped = p.entries.filter((e) => e.watchStatus === "dropped");
    assert.ok(dropped.length >= 2);
    assert.ok(
      dropped.some(
        (e) => Number(e.episodes) >= 50 || Number(e.episodes) >= 200,
      ),
    );
  });
});
