/** Classify mood retrieval: live multi-source vs offline catalogue. */

export type MoodRetrievalSource = {
  source: string;
  requested: number;
  returned: number;
  error?: string;
};

export type RetrievalMode = "live" | "mixed" | "offline" | "live-only-policy";

export type RetrievalSummary = {
  mode: RetrievalMode;
  label: string;
  detail: string;
  liveSources: string[];
  offlineSources: string[];
  failedSources: string[];
  offlineSeedDisabled: boolean;
};

const LIVE_PREFIXES = [
  "shiki:",
  "mal:",
  "simkl:",
  "tmdb:",
  "anilist-",
  "jikan:",
  "discover:",
  "tag:",
  "genre:",
];

const OFFLINE_PREFIXES = ["curated:", "static:"];

function isLiveSource(name: string): boolean {
  if (name.endsWith(":skip") || name.endsWith(":disabled")) return false;
  return LIVE_PREFIXES.some((p) => name.startsWith(p));
}

function isOfflineSource(name: string): boolean {
  if (name.endsWith(":disabled")) return false;
  return OFFLINE_PREFIXES.some((p) => name.startsWith(p));
}

export function summarizeRetrieval(
  retrieval: MoodRetrievalSource[],
  opts?: { offlineSeedEnabled?: boolean },
): RetrievalSummary {
  const liveSources: string[] = [];
  const offlineSources: string[] = [];
  const failedSources: string[] = [];
  const offlineSeedDisabled =
    opts?.offlineSeedEnabled === false ||
    retrieval.some((r) => r.source.endsWith(":disabled"));

  for (const r of retrieval) {
    if (r.returned > 0) {
      if (isOfflineSource(r.source)) offlineSources.push(r.source);
      else if (isLiveSource(r.source)) liveSources.push(r.source);
      else offlineSources.push(r.source);
    } else if (
      r.error &&
      !r.source.endsWith(":skip") &&
      !r.source.endsWith(":disabled")
    ) {
      failedSources.push(r.source);
    }
  }

  let mode: RetrievalMode = "offline";
  if (offlineSeedDisabled && liveSources.length > 0) mode = "live-only-policy";
  else if (liveSources.length > 0 && offlineSources.length > 0) mode = "mixed";
  else if (liveSources.length > 0) mode = "live";
  else if (offlineSeedDisabled) mode = "live-only-policy";

  const label =
    mode === "live"
      ? "Live multi-source"
      : mode === "mixed"
        ? "Mixed · live + offline"
        : mode === "live-only-policy"
          ? "Live only · offline seed off"
          : "Offline fallback catalogue";

  const detail =
    mode === "live"
      ? `Pulled from ${liveSources.length} live source${liveSources.length === 1 ? "" : "s"}.`
      : mode === "mixed"
        ? `Live sources responded (${liveSources.length}); offline seed also used.`
        : mode === "live-only-policy"
          ? liveSources.length
            ? `Offline curated/static seed is disabled. Showing ${liveSources.length} live source${liveSources.length === 1 ? "" : "s"} only.`
            : "Offline seed is disabled and no live API returned data for this mood."
          : "Primary anime databases did not return data. Showing the built-in mood catalogue.";

  return {
    mode,
    label,
    detail,
    liveSources,
    offlineSources,
    failedSources,
    offlineSeedDisabled,
  };
}
