/**
 * Historical completion profiles by structure / experience proxies.
 */

import type { WatchlistEntry } from "@/lib/types";

export const COMPLETION_PROFILE_VERSION = "completion_profile_v1";

export type CompletionBucket = {
  key: string;
  completed: number;
  started: number;
  rate: number;
};

export type CompletionProfile = {
  version: string;
  byLength: CompletionBucket[];
  byFormat: CompletionBucket[];
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

export function buildCompletionProfile(
  entries: WatchlistEntry[],
): CompletionProfile {
  const lengthMap: Record<string, { c: number; s: number }> = {};
  const formatMap: Record<string, { c: number; s: number }> = {};
  let totalC = 0;
  let totalS = 0;

  for (const e of entries) {
    const status = e.watchStatus;
    const isDone = status === "completed";
    const isStarted =
      isDone ||
      status === "dropped" ||
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

  return {
    version: COMPLETION_PROFILE_VERSION,
    byLength,
    byFormat,
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
