/**
 * Historical completion profiles by structure + fingerprint dimensions.
 */

import type { WatchlistEntry } from "@/lib/types";
import {
  buildAnimePreferenceFingerprint,
  type AnimePreferenceFingerprint,
} from "@/lib/intelligence/items";

export const COMPLETION_PROFILE_VERSION = "completion_profile_v2";

export type CompletionBucket = {
  key: string;
  completed: number;
  started: number;
  rate: number;
};

export type DimCompletionStat = {
  dimension: string;
  completedMean: number;
  droppedMean: number;
  completedN: number;
  droppedN: number;
  finishBias: number;
};

export type CompletionProfile = {
  version: string;
  byLength: CompletionBucket[];
  byFormat: CompletionBucket[];
  byDimension: DimCompletionStat[];
  overallRate: number;
  evidenceCount: number;
};

function lengthKey(episodes: number | string | undefined): string {
  const n =
    typeof episodes === "number"
      ? episodes
      : parseInt(String(episodes || ""), 10);
  if (!Number.isFinite(n) || n <= 0) return "unknown";
  if (n <= 13) return "1-13";
  if (n <= 26) return "14-26";
  if (n <= 50) return "27-50";
  return "51+";
}

function rate(completed: number, started: number): number {
  if (started <= 0) return 0.5;
  return completed / started;
}

const TRACKED_DIMS = [
  "experience.pacing",
  "experience.cognitiveLoad",
  "experience.emotionalIntensity",
  "experience.actionIntensity",
  "experience.commitment",
  "narrative.narrativeComplexity",
  "narrative.mysteryDensity",
  "narrative.characterFocus",
  "narrative.relationshipFocus",
  "narrative.plotDensity",
  "emotional.darkness",
  "emotional.comfort",
  "emotional.humour",
  "style.atmosphere",
] as const;

function fpFromEntry(e: WatchlistEntry): AnimePreferenceFingerprint {
  return buildAnimePreferenceFingerprint({
    id: e.id,
    title: e.title,
    description: "",
    genre: (e.genres || e.tags || [])[0] || "",
    tags: e.genres || e.tags || [],
    status: "FINISHED",
    format: (e.format as never) || "TV",
    year: e.year || "",
    score: e.score || 0,
    popularity: 0,
    image: e.image,
    anilist_id: e.id,
    episodes: e.episodes ?? "",
    duration: e.duration || 24,
  });
}

function dimValue(fp: AnimePreferenceFingerprint, path: string): number {
  const [group, key] = path.split(".");
  if (!group || !key) return 0.5;
  const bag = (fp as unknown as Record<string, Record<string, number>>)[group];
  const v = bag?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0.5;
}

export function buildCompletionProfile(
  entries: WatchlistEntry[],
): CompletionProfile {
  const lengthMap: Record<string, { c: number; s: number }> = {};
  const formatMap: Record<string, { c: number; s: number }> = {};
  let totalC = 0;
  let totalS = 0;

  const dimDone: Record<string, number[]> = {};
  const dimDrop: Record<string, number[]> = {};
  for (const d of TRACKED_DIMS) {
    dimDone[d] = [];
    dimDrop[d] = [];
  }

  for (const e of entries) {
    const status = e.watchStatus;
    const isDone = status === "completed";
    const isDropped = status === "dropped";
    const isStarted =
      isDone ||
      isDropped ||
      status === "watching" ||
      (status === "paused" && (e.progress || 0) > 0);
    if (!isStarted) continue;

    totalS++;
    if (isDone) totalC++;

    const lk = lengthKey(e.episodes);
    if (!lengthMap[lk]) lengthMap[lk] = { c: 0, s: 0 };
    lengthMap[lk]!.s++;
    if (isDone) lengthMap[lk]!.c++;

    const fmt = String(e.format || "unknown").toUpperCase();
    if (!formatMap[fmt]) formatMap[fmt] = { c: 0, s: 0 };
    formatMap[fmt]!.s++;
    if (isDone) formatMap[fmt]!.c++;

    if (isDone || isDropped) {
      try {
        const fp = fpFromEntry(e);
        for (const d of TRACKED_DIMS) {
          const v = dimValue(fp, d);
          if (isDone) dimDone[d]!.push(v);
          else dimDrop[d]!.push(v);
        }
      } catch {
        /* soft */
      }
    }
  }

  const byLength: CompletionBucket[] = Object.entries(lengthMap).map(
    ([key, v]) => ({
      key,
      completed: v.c,
      started: v.s,
      rate: rate(v.c, v.s),
    }),
  );
  const byFormat: CompletionBucket[] = Object.entries(formatMap).map(
    ([key, v]) => ({
      key,
      completed: v.c,
      started: v.s,
      rate: rate(v.c, v.s),
    }),
  );

  const byDimension: DimCompletionStat[] = [];
  for (const d of TRACKED_DIMS) {
    const done = dimDone[d] || [];
    const drop = dimDrop[d] || [];
    if (done.length + drop.length < 2) continue;
    const mean = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5;
    const completedMean = mean(done);
    const droppedMean = mean(drop);
    byDimension.push({
      dimension: d,
      completedMean,
      droppedMean,
      completedN: done.length,
      droppedN: drop.length,
      finishBias: completedMean - droppedMean,
    });
  }
  byDimension.sort((a, b) => Math.abs(b.finishBias) - Math.abs(a.finishBias));

  return {
    version: COMPLETION_PROFILE_VERSION,
    byLength,
    byFormat,
    byDimension,
    overallRate: rate(totalC, totalS),
    evidenceCount: totalS,
  };
}

export function lengthCompletionRate(
  profile: CompletionProfile,
  episodes: number | string | undefined,
): number | null {
  const key = lengthKey(episodes);
  const hit = profile.byLength.find((b) => b.key === key);
  if (!hit || hit.started < 2) return null;
  return hit.rate;
}

export function dimensionCompletionAdjust(
  profile: CompletionProfile,
  fp: AnimePreferenceFingerprint,
): { delta: number; reasons: string[] } {
  const reasons: string[] = [];
  let delta = 0;
  let used = 0;
  for (const stat of profile.byDimension.slice(0, 8)) {
    if (stat.completedN + stat.droppedN < 3) continue;
    if (Math.abs(stat.finishBias) < 0.08) continue;
    const v = dimValue(fp, stat.dimension);
    const aligned = (v - 0.5) * stat.finishBias;
    delta += aligned * 0.35;
    used++;
    if (aligned > 0.04 && reasons.length < 2) {
      const leaf = stat.dimension.split(".")[1] || stat.dimension;
      reasons.push(
        stat.finishBias > 0
          ? `You finish ${leaf}-forward shows`
          : `High ${leaf} overlaps past drops`,
      );
    }
  }
  if (!used) return { delta: 0, reasons: [] };
  return {
    delta: Math.max(-0.18, Math.min(0.18, delta / Math.max(1, used * 0.5))),
    reasons,
  };
}
