/**
 * Taste Drift V3 — compare fingerprint horizons (stable / 90d / 30d).
 * Detects shifts like slowPayoff↑, actionIntensity↓ — not only Drama↑.
 */

import type { WatchlistEntry } from "@/lib/types";
import {
  buildUserPreferenceVector,
  type UserPreferenceVector,
} from "@/lib/intelligence/preference/user-preference-vector";
import type { AnimePreferenceFingerprint } from "@/lib/intelligence/items";
import { humanizeDimKey } from "@/lib/intelligence/items/fingerprint-similarity";

export const TASTE_DRIFT_VERSION = "drift_v3";

export type FingerprintTrend = {
  dimension: string;
  direction: "up" | "down" | "stable";
  strength: number;
  confidence: number;
  evidenceCount: number;
  label: string;
};

function dimDelta(
  older: number,
  newer: number,
): { direction: "up" | "down" | "stable"; strength: number } {
  const d = newer - older;
  if (Math.abs(d) < 0.08) return { direction: "stable", strength: Math.abs(d) };
  return {
    direction: d > 0 ? "up" : "down",
    strength: Math.min(1, Math.abs(d) * 1.4),
  };
}

export function detectFingerprintDrift(
  user: UserPreferenceVector,
  opts?: { minEvidence?: number; minStrength?: number },
): FingerprintTrend[] {
  const minEvidence = opts?.minEvidence ?? 2;
  const minStrength = opts?.minStrength ?? 0.1;
  if (user.evidenceCount < minEvidence) return [];

  const keys = new Set([
    ...Object.keys(user.stable),
    ...Object.keys(user.recent),
    ...Object.keys(user.mediumTerm),
  ]);

  const trends: FingerprintTrend[] = [];
  for (const dim of keys) {
    const stable = user.stable[dim] ?? 0.5;
    const medium = user.mediumTerm[dim] ?? 0.5;
    const recent = user.recent[dim] ?? 0.5;

    const primary = dimDelta(stable, recent);
    if (primary.direction === "stable" || primary.strength < minStrength) {
      const mid = dimDelta(stable, medium);
      if (mid.direction === "stable" || mid.strength < minStrength) continue;
      const conf = Math.min(
        0.75,
        0.3 + user.confidence * 0.4 + mid.strength * 0.25,
      );
      if (conf < 0.4) continue;
      trends.push({
        dimension: dim,
        direction: mid.direction,
        strength: mid.strength * 0.85,
        confidence: conf,
        evidenceCount: Math.round(user.evidenceCount),
        label: humanizeDimKey(dim),
      });
      continue;
    }

    const conf = Math.min(
      0.92,
      0.35 + user.confidence * 0.4 + primary.strength * 0.3,
    );
    if (conf < 0.42) continue;

    trends.push({
      dimension: dim,
      direction: primary.direction,
      strength: primary.strength,
      confidence: conf,
      evidenceCount: Math.round(user.evidenceCount),
      label: humanizeDimKey(dim),
    });
  }

  trends.sort(
    (a, b) => b.confidence * b.strength - a.confidence * a.strength,
  );
  return trends.slice(0, 12);
}

export function detectTasteDriftV3(
  entries: WatchlistEntry[],
  opts?: {
    fingerprints?: Map<number, AnimePreferenceFingerprint>;
    minEvidence?: number;
  },
): FingerprintTrend[] {
  const user = buildUserPreferenceVector(entries, {
    fingerprints: opts?.fingerprints,
  });
  return detectFingerprintDrift(user, { minEvidence: opts?.minEvidence });
}

export function fingerprintDriftSummary(
  trends: FingerprintTrend[],
): string | null {
  if (!trends.length) return null;
  const up = trends.filter((t) => t.direction === "up").slice(0, 3);
  const down = trends.filter((t) => t.direction === "down").slice(0, 3);
  const parts: string[] = [];
  if (up.length)
    parts.push(`rising ${up.map((t) => t.label.toLowerCase()).join(", ")}`);
  if (down.length)
    parts.push(`cooling ${down.map((t) => t.label.toLowerCase()).join(", ")}`);
  return parts.length ? `Fingerprint drift: ${parts.join("; ")}.` : null;
}
