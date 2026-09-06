/**
 * Tag / genre → dimension evidence (Tier 1–4).
 * Genre fallback is weakest; never overrides stronger evidence when merging.
 */

import type {
  EmotionalDims,
  ExperienceDims,
  NarrativeDims,
  StyleDims,
} from "./anime-preference-fingerprint";

export type DimPatch = {
  emotional?: Partial<EmotionalDims>;
  narrative?: Partial<NarrativeDims>;
  experience?: Partial<ExperienceDims>;
  style?: Partial<StyleDims>;
  weight: number;
  source: string;
};

function norm(s: string): string {
  return s.toLowerCase().trim();
}

export function evidenceFromLabel(label: string): DimPatch | null {
  const t = norm(label);
  if (!t) return null;

  const map: Record<string, DimPatch> = {
    comedy: {
      weight: 0.55,
      source: "genre-fallback",
      emotional: { humour: 0.85, comfort: 0.65, darkness: 0.25 },
      experience: { cognitiveLoad: 0.35, accessibility: 0.75 },
    },
    parody: {
      weight: 0.5,
      source: "genre-fallback",
      emotional: { humour: 0.9 },
      style: { tonalVolatility: 0.7 },
    },
    romance: {
      weight: 0.55,
      source: "genre-fallback",
      emotional: { romance: 0.85, hope: 0.6 },
      narrative: { relationshipFocus: 0.85, characterFocus: 0.7 },
    },
    drama: {
      weight: 0.5,
      source: "genre-fallback",
      emotional: { melancholy: 0.65, catharsis: 0.7 },
      narrative: { characterFocus: 0.75 },
      experience: { emotionalIntensity: 0.7 },
    },
    psychological: {
      weight: 0.7,
      source: "anilist-tags",
      narrative: {
        narrativeComplexity: 0.85,
        moralAmbiguity: 0.8,
        characterFocus: 0.75,
      },
      experience: { cognitiveLoad: 0.85, pacing: 0.35 },
      emotional: { tension: 0.7, darkness: 0.65 },
    },
    mystery: {
      weight: 0.65,
      source: "anilist-tags",
      narrative: {
        mysteryDensity: 0.9,
        slowPayoff: 0.7,
        plotDensity: 0.7,
        twistDensity: 0.65,
      },
      experience: { cognitiveLoad: 0.7 },
    },
    thriller: {
      weight: 0.6,
      source: "anilist-tags",
      emotional: { tension: 0.85, darkness: 0.6 },
      narrative: { plotDensity: 0.75, twistDensity: 0.7 },
      experience: { pacing: 0.65, cognitiveLoad: 0.65 },
    },
    horror: {
      weight: 0.6,
      source: "genre-fallback",
      emotional: { darkness: 0.85, tension: 0.8, comfort: 0.15 },
      experience: { emotionalIntensity: 0.75 },
    },
    action: {
      weight: 0.55,
      source: "genre-fallback",
      experience: { actionIntensity: 0.85, pacing: 0.75, cognitiveLoad: 0.4 },
      emotional: { hope: 0.55, catharsis: 0.55 },
    },
    adventure: {
      weight: 0.5,
      source: "genre-fallback",
      emotional: { wonder: 0.7, hope: 0.6 },
      experience: { actionIntensity: 0.6, pacing: 0.65 },
      narrative: { worldBuilding: 0.65 },
    },
    fantasy: {
      weight: 0.5,
      source: "genre-fallback",
      emotional: { wonder: 0.75 },
      narrative: { worldBuilding: 0.8 },
    },
    "slice of life": {
      weight: 0.55,
      source: "genre-fallback",
      emotional: { comfort: 0.8, hope: 0.55 },
      experience: { pacing: 0.3, cognitiveLoad: 0.3, accessibility: 0.8 },
      narrative: { characterFocus: 0.7, relationshipFocus: 0.6 },
    },
    "sci-fi": {
      weight: 0.5,
      source: "genre-fallback",
      narrative: { worldBuilding: 0.75, narrativeComplexity: 0.65 },
      experience: { cognitiveLoad: 0.65 },
    },
    mecha: {
      weight: 0.55,
      source: "anilist-tags",
      narrative: { worldBuilding: 0.7, politicalComplexity: 0.55 },
      experience: { actionIntensity: 0.7, commitment: 0.65 },
    },
    suspense: {
      weight: 0.6,
      source: "anilist-tags",
      emotional: { tension: 0.85 },
      narrative: { mysteryDensity: 0.7, slowPayoff: 0.6 },
    },
    supernatural: {
      weight: 0.45,
      source: "genre-fallback",
      emotional: { wonder: 0.55, darkness: 0.55 },
    },
    sports: {
      weight: 0.5,
      source: "genre-fallback",
      emotional: { hope: 0.65, catharsis: 0.7 },
      experience: { pacing: 0.7, actionIntensity: 0.55 },
    },
  };

  if (map[t]) return { ...map[t] };
  for (const [k, v] of Object.entries(map)) {
    if (t.includes(k) || k.includes(t)) {
      return { ...v, weight: v.weight * 0.85 };
    }
  }
  return null;
}

export function mergePatches(
  base: {
    emotional: EmotionalDims;
    narrative: NarrativeDims;
    experience: ExperienceDims;
    style: StyleDims;
  },
  patches: DimPatch[],
): {
  emotional: EmotionalDims;
  narrative: NarrativeDims;
  experience: ExperienceDims;
  style: StyleDims;
  sources: string[];
  evidenceWeights: Record<string, number>;
} {
  const emotional = { ...base.emotional };
  const narrative = { ...base.narrative };
  const experience = { ...base.experience };
  const style = { ...base.style };
  const evidenceWeights: Record<string, number> = {};
  const sources = new Set<string>();

  type Acc = Record<string, { sum: number; w: number }>;
  const buckets: Record<string, Acc> = {
    emotional: {},
    narrative: {},
    experience: {},
    style: {},
  };

  function accumulate(
    group: string,
    partial: Record<string, number> | undefined,
    w: number,
  ) {
    if (!partial) return;
    const b = buckets[group];
    for (const [k, val] of Object.entries(partial)) {
      if (typeof val !== "number" || !Number.isFinite(val)) continue;
      if (!b[k]) b[k] = { sum: 0, w: 0 };
      b[k].sum += val * w;
      b[k].w += w;
      evidenceWeights[`${group}.${k}`] =
        (evidenceWeights[`${group}.${k}`] || 0) + w;
    }
  }

  const hasStrong = patches.some((x) => x.source !== "genre-fallback");
  for (const p of patches) {
    sources.add(p.source);
    const w =
      p.source === "genre-fallback" && hasStrong ? p.weight * 0.35 : p.weight;
    accumulate("emotional", p.emotional as Record<string, number>, w);
    accumulate("narrative", p.narrative as Record<string, number>, w);
    accumulate("experience", p.experience as Record<string, number>, w);
    accumulate("style", p.style as Record<string, number>, w);
  }

  function apply(group: string, target: Record<string, number>) {
    for (const [k, { sum, w }] of Object.entries(buckets[group])) {
      if (w <= 0) continue;
      const blended = sum / w;
      const conf = Math.min(1, w / 1.2);
      target[k] = 0.5 * (1 - conf) + blended * conf;
    }
  }

  apply("emotional", emotional as unknown as Record<string, number>);
  apply("narrative", narrative as unknown as Record<string, number>);
  apply("experience", experience as unknown as Record<string, number>);
  apply("style", style as unknown as Record<string, number>);

  return {
    emotional,
    narrative,
    experience,
    style,
    sources: [...sources],
    evidenceWeights,
  };
}
