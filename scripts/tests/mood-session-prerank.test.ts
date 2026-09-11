/**
 * Session modifiers must change fingerprintIntentFit and pre-rank order.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fingerprintIntentFit } from "../../lib/viewing-intent.ts";
import { getExperienceIntent } from "../../lib/viewing-intent.ts";
import { buildEnrichedFingerprint } from "../../lib/intelligence/items/fingerprint-enrichment.ts";
import type { Anime } from "../../lib/types.ts";
import type { IntentSession } from "../../lib/intent-session.ts";

function stubAnime(partial: Partial<Anime> & { id: number; title: string }): Anime {
  return {
    description: "",
    genre: partial.genre || "Drama",
    tags: partial.tags || [],
    status: "FINISHED",
    format: "TV",
    year: 2015,
    score: 80,
    popularity: 1000,
    image: "",
    anilist_id: partial.id,
    episodes: 12,
    duration: 24,
    ...partial,
  } as Anime;
}

describe("session pre-rank via fingerprintIntentFit", () => {
  it("Destroy Low-Energy Easy vs High-Energy Demanding changes fit", () => {
    const exp = getExperienceIntent("destroy");
    assert.ok(exp);
    const heavy = stubAnime({
      id: 1,
      title: "Heavy Drama",
      genre: "Drama",
      tags: ["Tragedy", "Psychological", "Drama"],
    });
    const fp = buildEnrichedFingerprint(heavy);
    const lowEasy = {
      slug: "destroy",
      energy: "low",
      attention: "easy",
      intensity: "maximum",
      minutesAvailable: null,
    } as IntentSession;
    const highDem = {
      slug: "destroy",
      energy: "high",
      attention: "demanding",
      intensity: "light",
      minutesAvailable: null,
    } as IntentSession;
    const a = fingerprintIntentFit(fp, exp!, lowEasy);
    const b = fingerprintIntentFit(fp, exp!, highDem);
    assert.notEqual(
      Math.round(a * 1000),
      Math.round(b * 1000),
      `session must change fit: ${a} vs ${b}`,
    );
  });

  it("Comfort ranking prefers high comfort dims over high tension", () => {
    const exp = getExperienceIntent("comfort");
    assert.ok(exp);
    const tense = stubAnime({
      id: 2,
      title: "Tense",
      genre: "Thriller",
      tags: ["Thriller", "Suspense", "Horror"],
    });
    const soft = stubAnime({
      id: 3,
      title: "Soft",
      genre: "Slice of Life",
      tags: ["Slice of Life", "Iyashikei", "School"],
    });
    const session = {
      slug: "comfort",
      energy: "low",
      attention: "easy",
      intensity: "maximum",
      minutesAvailable: null,
    } as IntentSession;
    const fitT = fingerprintIntentFit(
      buildEnrichedFingerprint(tense),
      exp!,
      session,
    );
    const fitS = fingerprintIntentFit(
      buildEnrichedFingerprint(soft),
      exp!,
      session,
    );
    assert.ok(
      fitS > fitT,
      `comfort should prefer soft ${fitS} > tense ${fitT}`,
    );
  });
});
