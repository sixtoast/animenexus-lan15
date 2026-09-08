import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SYNTHETIC_PERSONAS,
  getPersona,
} from "../../lib/intelligence/evaluation/personas.ts";

describe("synthetic personas", () => {
  it("exports at least 7 personas with entries", () => {
    assert.ok(SYNTHETIC_PERSONAS.length >= 7);
    for (const p of SYNTHETIC_PERSONAS) {
      assert.ok(p.id);
      assert.ok(p.label);
      assert.ok(Array.isArray(p.entries));
      assert.ok(p.entries.every((e) => typeof e.id === "number"));
    }
  });

  it("getPersona resolves by id", () => {
    const p = getPersona("psychological_specialist");
    assert.ok(p);
    assert.equal(p!.id, "psychological_specialist");
  });

  it("long_series_dropper has dropped long shows", () => {
    const p = getPersona("long_series_dropper");
    assert.ok(p);
    const drops = p!.entries.filter((e) => e.watchStatus === "dropped");
    assert.ok(drops.length >= 2);
    assert.ok(
      drops.some(
        (e) =>
          (typeof e.episodes === "number" ? e.episodes : 0) > 50,
      ),
    );
  });
});
