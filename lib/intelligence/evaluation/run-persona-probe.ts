/**
 * Client-safe persona probe — builds V3 model and reports properties.
 */

import {
  buildUserPreferenceVector,
  blendUserVector,
} from "@/lib/intelligence/preference/user-preference-vector";
import { buildTasteClustersV3 } from "@/lib/intelligence/taste/taste-clusters-v3";
import { detectTasteDriftV3 } from "@/lib/intelligence/taste/taste-drift-v3";
import { inferNoveltyTolerance } from "@/lib/intelligence/preference/novelty-tolerance";
import { detectTasteContradictions } from "@/lib/intelligence/taste/taste-contradictions";
import { detectBlindSpots } from "@/lib/intelligence/taste/blind-spots";
import { topPeakDims } from "@/lib/intelligence/taste/cluster-naming";
import { humanizeDimKey } from "@/lib/intelligence/items/fingerprint-similarity";
import type { SyntheticPersona } from "./personas";

export type PersonaProbeResult = {
  personaId: string;
  label: string;
  expected: string[];
  userConfidence: number;
  evidenceCount: number;
  topStableDims: string[];
  clusters: { label: string; state: string; strength: number }[];
  drift: { label: string; direction: string; strength: number }[];
  novelty: { value: number; confidence: number };
  contradictions: string[];
  blindSpots: string[];
};

export function probePersona(persona: SyntheticPersona): PersonaProbeResult {
  const user = buildUserPreferenceVector(persona.entries);
  const blended = blendUserVector(user);
  const peaks = topPeakDims(blended, 6, 0.08);
  const clusters = buildTasteClustersV3(persona.entries);
  const drift = detectTasteDriftV3(persona.entries);
  const novelty = inferNoveltyTolerance(persona.entries);
  const contradictions = detectTasteContradictions(persona.entries, {
    minEvidence: 3,
  });
  const blind = detectBlindSpots(persona.entries, { maxSpots: 3 });

  return {
    personaId: persona.id,
    label: persona.label,
    expected: persona.expected,
    userConfidence: user.confidence,
    evidenceCount: user.evidenceCount,
    topStableDims: peaks.map(
      (p) =>
        `${humanizeDimKey(p.key)}${p.high ? "\u2191" : "\u2193"} (${p.value.toFixed(2)})`,
    ),
    clusters: clusters.map((c) => ({
      label: c.label,
      state: c.state,
      strength: Math.round(c.strength * 100) / 100,
    })),
    drift: drift.slice(0, 5).map((t) => ({
      label: t.label,
      direction: t.direction,
      strength: Math.round(t.strength * 100) / 100,
    })),
    novelty: {
      value: Math.round(novelty.value * 100) / 100,
      confidence: Math.round(novelty.confidence * 100) / 100,
    },
    contradictions: contradictions.map((c) => c.claim),
    blindSpots: blind.map(
      (b) => `${b.label} (${b.exposure}, compat ${b.compatibility.toFixed(2)})`,
    ),
  };
}
