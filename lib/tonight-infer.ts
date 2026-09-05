/**
 * Passive default for Tonight UI — Lantern guesses; user overrides.
 */

import type { WatchlistEntry } from "./types";
import { detectTasteTrends } from "./taste-drift";
import { buildTasteClusters } from "./taste-clusters";
import type { IntentSession } from "./intent-session";
import { EXPERIENCE_INTENTS } from "./viewing-intent";

export type TonightGuess = {
  slug: string;
  label: string;
  line: string;
  intensity: IntentSession["intensity"];
  energy: IntentSession["energy"];
  attention: IntentSession["attention"];
};

/** Map recent shelf texture → a soft experience guess. */
export function inferTonightGuess(entries: WatchlistEntry[]): TonightGuess {
  const trends = detectTasteTrends(entries, 2);
  const clusters = buildTasteClusters(entries, 3);
  const up = trends.filter((t) => t.direction === "up").map((t) => t.dimension);

  let slug = "comfort";
  if (up.some((d) => ["horror", "thriller", "psychological"].includes(d))) {
    slug = "tense";
  } else if (up.some((d) => ["drama", "romance"].includes(d))) {
    slug = "destroy";
  } else if (up.some((d) => ["comedy", "parody"].includes(d))) {
    slug = "laugh";
  } else if (up.some((d) => ["fantasy", "adventure"].includes(d))) {
    slug = "wonder";
  } else if (clusters[0]?.id === "cerebral") {
    slug = "think";
  } else if (clusters[0]?.id === "chaotic") {
    slug = "chaotic";
  } else if (clusters[0]?.id === "emotional") {
    slug = "gentle";
  }

  const exp = EXPERIENCE_INTENTS.find((e) => e.slug === slug);
  const hour = new Date().getHours();
  const energy: IntentSession["energy"] =
    hour >= 22 || hour < 6 ? "low" : "medium";
  const intensity: IntentSession["intensity"] =
    slug === "destroy" || slug === "tense" ? "maximum" : "moderate";
  const attention: IntentSession["attention"] =
    slug === "think"
      ? "demanding"
      : slug === "comfort" || slug === "gentle"
        ? "easy"
        : "medium";

  const bits = [
    exp?.label?.replace(/ me$/, "") || slug,
    `${energy} energy`,
    intensity === "maximum"
      ? "high intensity"
      : intensity === "light"
        ? "gentle"
        : "steady",
  ];

  return {
    slug,
    label: exp?.label || slug,
    line: bits.join(" · "),
    intensity,
    energy,
    attention,
  };
}
