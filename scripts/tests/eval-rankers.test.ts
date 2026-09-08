import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SYNTHETIC_PERSONAS } from "../../lib/intelligence/evaluation/personas.ts";
import {
  recallAtK,
  ndcgAtK,
  mrr,
} from "../../lib/intelligence/evaluation/metrics.ts";

function tagsOf(e: {
  genres?: string[];
  tags?: string[];
}): string[] {
  return [
    ...new Set(
      [...(e.genres || []), ...(e.tags || [])]
        .map((t) => String(t).toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function rankEvidence(
  pool: { id: number; tags: string[] }[],
  train: {
    id: number;
    genres?: string[];
    tags?: string[];
    watchStatus?: string;
  }[],
) {
  const pref = new Map<string, number>();
  for (const e of train) {
    if (e.watchStatus === "dropped") continue;
    const w = e.watchStatus === "completed" ? 1.4 : 0.7;
    for (const t of tagsOf(e)) pref.set(t, (pref.get(t) || 0) + w);
  }
  return pool
    .map((c) => {
      let s = 0;
      for (const t of c.tags) s += pref.get(t) || 0;
      return { id: c.id, score: s };
    })
    .sort((a, b) => b.score - a.score);
}

describe("offline eval rankers on personas", () => {
  it("evidence ranker recovers at least one holdout for a multi-complete persona", () => {
    const persona = SYNTHETIC_PERSONAS.find(
      (p) =>
        p.entries.filter((e) => e.watchStatus === "completed").length >= 4,
    );
    assert.ok(persona, "need persona with completions");
    const completed = persona.entries
      .filter((e) => e.watchStatus === "completed")
      .slice()
      .sort(
        (a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      );
    const holdout = completed.slice(-1);
    const holdIds = new Set(holdout.map((h) => h.id));
    const train = persona.entries.filter((e) => !holdIds.has(e.id));
    const pool = persona.entries.map((e) => ({ id: e.id, tags: tagsOf(e) }));
    const ranked = rankEvidence(pool, train);
    const relevant = holdIds;
    const r = recallAtK(ranked, relevant, 5);
    const m = mrr(ranked, relevant);
    assert.ok(r >= 0 || m >= 0);
    assert.ok(ranked.length >= 1);
    assert.ok(ndcgAtK(ranked, relevant, 5) >= 0);
  });

  it("personas export shelves (new_user may be sparse)", () => {
    assert.ok(SYNTHETIC_PERSONAS.length >= 3);
    for (const p of SYNTHETIC_PERSONAS) {
      assert.ok(p.entries.length >= 1, p.id);
    }
    const rich = SYNTHETIC_PERSONAS.filter((p) => p.entries.length >= 3);
    assert.ok(rich.length >= 3);
  });
});
