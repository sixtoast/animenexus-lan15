/**
 * Taste Forecast — where preference is heading + soft contradictions.
 * Soft-fail: empty when evidence is thin.
 */

import type { WatchlistEntry } from "./types";
import {
  detectTasteTrends,
  buildWindowProfiles,
  type TasteTrend,
} from "./taste-drift";
import { buildTasteClusters } from "./taste-clusters";
import { buildFatigueProfile } from "./taste-fatigue";

export type ForecastLine = {
  kind: "rising" | "cooling" | "stable" | "contradiction" | "fatigue";
  title: string;
  body: string;
  confidence: number;
};

export type TasteForecast = {
  lines: ForecastLine[];
  headline: string | null;
  trends: TasteTrend[];
};

function capital(s: string): string {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Detect mild contradictions between historical identity and recent behaviour. */
function contradictions(
  entries: WatchlistEntry[],
  trends: TasteTrend[],
): ForecastLine[] {
  const out: ForecastLine[] = [];
  const clusters = buildTasteClusters(entries);
  const primary = clusters[0];
  if (!primary) return out;

  const coolingOnCore = trends.filter(
    (t) =>
      t.direction === "down" &&
      Object.keys(primary.dims).some(
        (d) => d === t.dimension || t.dimension.includes(d),
      ),
  );
  for (const t of coolingOnCore.slice(0, 1)) {
    out.push({
      kind: "contradiction",
      title: "Soft contradiction",
      body: `Your shelf still reads “${primary.label}”, but ${capital(t.dimension)} has cooled recently. Either a pause — or a real shift.`,
      confidence: t.confidence * 0.9,
    });
  }

  const risingOutside = trends.filter(
    (t) =>
      t.direction === "up" &&
      !Object.keys(primary.dims).some(
        (d) => d === t.dimension || t.dimension.includes(d),
      ),
  );
  for (const t of risingOutside.slice(0, 1)) {
    out.push({
      kind: "contradiction",
      title: "New lane opening",
      body: `${capital(t.dimension)} is rising outside your strongest cluster (${primary.label}). Exploration — or the start of a second interest.`,
      confidence: t.confidence * 0.85,
    });
  }
  return out;
}

export function buildTasteForecast(
  entries: WatchlistEntry[],
): TasteForecast {
  if (entries.length < 4) {
    return {
      lines: [],
      headline: null,
      trends: [],
    };
  }

  const trends = detectTasteTrends(entries, 2);
  const lines: ForecastLine[] = [];

  for (const t of trends.filter((x) => x.direction === "up").slice(0, 3)) {
    lines.push({
      kind: "rising",
      title: `Rising · ${capital(t.dimension)}`,
      body: `Recent activity is denser here than your longer history (evidence ~${t.evidenceCount}).`,
      confidence: t.confidence,
    });
  }
  for (const t of trends.filter((x) => x.direction === "down").slice(0, 2)) {
    lines.push({
      kind: "cooling",
      title: `Cooling · ${capital(t.dimension)}`,
      body: `Less present in the last month relative to your baseline.`,
      confidence: t.confidence,
    });
  }

  lines.push(...contradictions(entries, trends));

  const fatigue = buildFatigueProfile(entries, 21);
  const saturated = Object.entries(fatigue.tagSaturation)
    .filter(([, v]) => v >= 0.7)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  for (const [tag, v] of saturated) {
    lines.push({
      kind: "fatigue",
      title: `Fatigue risk · ${capital(tag)}`,
      body: `High recent saturation (${Math.round(v * 100)}%). Lantern will soft-dampen similar picks tonight — not a permanent dislike.`,
      confidence: Math.min(1, v),
    });
  }

  if (!trends.length) {
    const hist = buildWindowProfiles(entries).find(
      (p) => p.label === "historical",
    );
    const top = Object.entries(hist?.dims || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => capital(k));
    if (top.length) {
      lines.push({
        kind: "stable",
        title: "Steady core",
        body: `No strong drift yet. Your longer pattern still centres on ${top.join(" & ")}.`,
        confidence: 0.5,
      });
    }
  }

  lines.sort((a, b) => b.confidence - a.confidence);

  const up = trends.filter((t) => t.direction === "up")[0];
  const headline = up
    ? `You’re drifting toward ${capital(up.dimension)}.`
    : trends[0]?.direction === "down"
      ? `You’re cooling on ${capital(trends[0].dimension)}.`
      : lines.find((l) => l.kind === "stable")?.title
        ? "Taste is holding steady."
        : null;

  return {
    lines: lines.slice(0, 6),
    headline,
    trends,
  };
}
