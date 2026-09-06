import type {
  FingerprintConfidence,
  FingerprintSource,
} from "./anime-preference-fingerprint";

export function computeFingerprintConfidence(opts: {
  sources: FingerprintSource[];
  evidenceWeights: Record<string, number>;
}): FingerprintConfidence {
  const dimensions: Record<string, number> = {};
  let sum = 0;
  let n = 0;
  for (const [dim, w] of Object.entries(opts.evidenceWeights)) {
    const c = Math.min(0.95, 0.25 + w * 0.4);
    dimensions[dim] = c;
    sum += c;
    n += 1;
  }
  const onlyGenre =
    opts.sources.length > 0 &&
    opts.sources.every((s) => s === "genre-fallback");
  let overall = n ? sum / n : 0.2;
  if (onlyGenre) overall = Math.min(overall, 0.35);
  if (
    opts.sources.includes("anilist-tags") ||
    opts.sources.includes("deep-tags")
  ) {
    overall = Math.min(0.92, overall + 0.08);
  }
  if (opts.sources.includes("structure")) {
    overall = Math.min(0.95, overall + 0.04);
  }
  return { overall, dimensions };
}
