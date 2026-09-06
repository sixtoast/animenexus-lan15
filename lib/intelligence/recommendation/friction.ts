/**
 * Potential friction — why a user may NOT like a recommendation.
 */

import type { Anime, WatchlistEntry } from "@/lib/types";
import {
  buildAnimePreferenceFingerprint,
  type AnimePreferenceFingerprint,
  type FingerprintVector,
} from "@/lib/intelligence/items";
import {
  buildCompletionProfile,
  lengthCompletionRate,
} from "@/lib/intelligence/outcomes/completion-profile";
import { readIntentSession } from "@/lib/intent-session";

export const FRICTION_VERSION = "friction_v1";

export type FrictionSignal = {
  type: string;
  severity: number;
  confidence: number;
  messageKey: string;
  message: string;
};

export function detectFriction(
  anime: Anime,
  entries: WatchlistEntry[],
  opts?: {
    userVector?: FingerprintVector;
    fingerprint?: AnimePreferenceFingerprint;
    recentPace?: number;
  },
): FrictionSignal[] {
  const signals: FrictionSignal[] = [];
  const fp = opts?.fingerprint || buildAnimePreferenceFingerprint(anime);
  const profile = buildCompletionProfile(entries);

  const lr = lengthCompletionRate(profile, anime.episodes);
  if (lr != null && lr < 0.4 && profile.evidenceCount >= 3) {
    signals.push({
      type: "length",
      severity: Math.min(1, 0.4 + (0.4 - lr)),
      confidence: 0.55 + Math.min(0.3, profile.evidenceCount * 0.03),
      messageKey: "longer_than_usual",
      message: "Longer than series you usually finish",
    });
  }

  let sessionLoad: number | null = null;
  try {
    if (typeof window !== "undefined") {
      const s = readIntentSession();
      if (s?.attention === "easy") sessionLoad = 0.3;
      else if (s?.attention === "demanding") sessionLoad = 0.75;
      else if (s?.attention === "medium") sessionLoad = 0.5;
      if (s?.intensity === "light")
        sessionLoad = Math.min(sessionLoad ?? 0.5, 0.35);
      if (s?.intensity === "maximum")
        sessionLoad = Math.max(sessionLoad ?? 0.5, 0.75);
    }
  } catch {
    /* */
  }
  const itemLoad = fp.experience.cognitiveLoad;
  if (sessionLoad != null && itemLoad > sessionLoad + 0.22) {
    signals.push({
      type: "cognitive_load",
      severity: Math.min(1, itemLoad - sessionLoad),
      confidence: 0.5,
      messageKey: "higher_cognitive_load",
      message: "Higher cognitive load than tonight's intent",
    });
  }

  const recentPace = opts?.recentPace;
  if (recentPace != null) {
    const itemPace = fp.experience.pacing;
    if (itemPace < recentPace - 0.25) {
      signals.push({
        type: "pacing",
        severity: Math.min(1, recentPace - itemPace),
        confidence: 0.45,
        messageKey: "slower_than_recent",
        message: "Slower than your recent watches",
      });
    }
  }

  if (opts?.userVector) {
    const userRom = opts.userVector["emotional.romance"] ?? 0.5;
    const itemRom = fp.emotional.romance;
    if (itemRom > userRom + 0.28) {
      signals.push({
        type: "romance",
        severity: Math.min(1, itemRom - userRom),
        confidence: 0.48,
        messageKey: "more_romance",
        message: "More romance-forward than your usual cluster",
      });
    }
    const userAct = opts.userVector["experience.actionIntensity"] ?? 0.5;
    const itemAct = fp.experience.actionIntensity;
    if (userAct > 0.6 && itemAct < userAct - 0.28) {
      signals.push({
        type: "action",
        severity: Math.min(1, userAct - itemAct),
        confidence: 0.45,
        messageKey: "lower_action",
        message: "Lower action than your recent pattern",
      });
    }
  }

  if (
    (fp.experience.commitment ?? 0.5) > 0.8 ||
    (fp.structure.franchiseCommitment ?? 0) > 0.7
  ) {
    signals.push({
      type: "commitment",
      severity: 0.45,
      confidence: 0.4,
      messageKey: "high_franchise_commitment",
      message: "High franchise or episode commitment",
    });
  }

  signals.sort(
    (a, b) => b.severity * b.confidence - a.severity * a.confidence,
  );
  return signals.slice(0, 5);
}
