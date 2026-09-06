/**
 * Heuristic completion likelihood for ranking (not shown as %).
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  buildCompletionProfile,
  lengthCompletionRate,
  type CompletionProfile,
} from "@/lib/intelligence/outcomes/completion-profile";
import {
  buildAnimePreferenceFingerprint,
  type AnimePreferenceFingerprint,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import {
  vectorSimilarity,
  WEIGHTS_LONG_TERM,
} from "@/lib/intelligence/items/fingerprint-similarity";
import { buildDropSignatures, dropPenalty } from "@/lib/drop-signatures";

export const COMPLETION_LIKELIHOOD_VERSION = "completion_likelihood_v1";

export type CompletionLikelihood = {
  probability: number;
  confidence: number;
  reasons: string[];
};

export function estimateCompletionLikelihood(
  anime: Anime,
  entries: WatchlistEntry[],
  opts?: {
    userVector?: FingerprintVector;
    fingerprint?: AnimePreferenceFingerprint;
    profile?: CompletionProfile;
  },
): CompletionLikelihood {
  const reasons: string[] = [];
  let p = 0.5;
  let conf = 0.25;
  const profile = opts?.profile || buildCompletionProfile(entries);

  const lr = lengthCompletionRate(profile, anime.episodes);
  if (lr != null) {
    p = p * 0.55 + lr * 0.45;
    conf += 0.15;
    if (lr >= 0.7) reasons.push("Fits lengths you usually finish");
    else if (lr <= 0.35) reasons.push("Longer than your usual finish range");
  }

  if (profile.evidenceCount >= 4) {
    conf += 0.1;
    p = p * 0.85 + profile.overallRate * 0.15;
  }

  const fp = opts?.fingerprint || buildAnimePreferenceFingerprint(anime);
  if (opts?.userVector) {
    const sim = vectorSimilarity(opts.userVector, fp, WEIGHTS_LONG_TERM);
    p = p * 0.6 + sim * 0.4;
    conf += 0.12;
    if (sim >= 0.65) reasons.push("Strong fingerprint affinity");
    else if (sim < 0.4) reasons.push("Weaker match to your finish patterns");
  }

  const fmt = String(anime.format || "").toUpperCase();
  const fmtBucket = profile.byFormat.find((b) => b.key === fmt);
  if (fmtBucket && fmtBucket.started >= 2) {
    p = p * 0.75 + fmtBucket.rate * 0.25;
    conf += 0.08;
  }

  try {
    const sigs = buildDropSignatures(entries, 2);
    const { penalty } = dropPenalty(
      sigs,
      anime.tags,
      String(anime.format || ""),
      anime.episodes,
    );
    if (penalty > 0.05) {
      p = Math.max(0.1, p - penalty * 0.35);
      conf += 0.05;
      reasons.push("Overlaps past drop patterns");
    }
  } catch {
    /* soft */
  }

  if ((fp.experience.commitment ?? 0.5) > 0.75) {
    p = Math.max(0.12, p - 0.08);
    reasons.push("High time commitment");
  }

  conf = Math.min(0.9, conf);
  if (profile.evidenceCount < 3) {
    conf = Math.min(conf, 0.4);
    p = 0.5 * 0.6 + p * 0.4;
  }

  if (!reasons.length) reasons.push("Limited completion evidence");

  return {
    probability: Math.max(0.05, Math.min(0.95, p)),
    confidence: conf,
    reasons: reasons.slice(0, 4),
  };
}
