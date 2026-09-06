/**
 * Tag / genre / deep-tag → dimension evidence (Tier 1–4).
 * Sources (strongest → weakest): deep-tags, anilist-tags, synopsis-heuristic, structure, genre-fallback
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
  return s
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

const EVIDENCE_MAP: Record<string, DimPatch> = {
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
  action: {
    weight: 0.55,
    source: "genre-fallback",
    experience: { actionIntensity: 0.85, pacing: 0.75, cognitiveLoad: 0.4 },
    emotional: { catharsis: 0.65 },
  },
  adventure: {
    weight: 0.5,
    source: "genre-fallback",
    narrative: { worldBuilding: 0.7 },
    experience: { actionIntensity: 0.65, pacing: 0.65 },
    emotional: { wonder: 0.6, hope: 0.55 },
  },
  fantasy: {
    weight: 0.5,
    source: "genre-fallback",
    narrative: { worldBuilding: 0.8 },
    emotional: { wonder: 0.75 },
  },
  "slice of life": {
    weight: 0.55,
    source: "genre-fallback",
    emotional: { comfort: 0.85, humour: 0.5 },
    experience: { pacing: 0.3, actionIntensity: 0.2, accessibility: 0.8 },
    narrative: { characterFocus: 0.75 },
  },
  "sci-fi": {
    weight: 0.5,
    source: "genre-fallback",
    narrative: { worldBuilding: 0.75, narrativeComplexity: 0.6 },
    experience: { cognitiveLoad: 0.55 },
  },
  mecha: {
    weight: 0.55,
    source: "genre-fallback",
    experience: { actionIntensity: 0.7 },
    narrative: { worldBuilding: 0.65, politicalComplexity: 0.55 },
  },
  sports: {
    weight: 0.55,
    source: "genre-fallback",
    experience: { actionIntensity: 0.6, emotionalIntensity: 0.65, pacing: 0.7 },
    emotional: { catharsis: 0.7, hope: 0.65 },
  },
  horror: {
    weight: 0.6,
    source: "genre-fallback",
    emotional: { darkness: 0.85, tension: 0.8, comfort: 0.15 },
    experience: { emotionalIntensity: 0.75 },
  },
  supernatural: {
    weight: 0.45,
    source: "genre-fallback",
    emotional: { wonder: 0.55, tension: 0.5 },
    narrative: { worldBuilding: 0.55 },
  },
  suspense: {
    weight: 0.55,
    source: "genre-fallback",
    emotional: { tension: 0.85 },
    narrative: { mysteryDensity: 0.6, plotDensity: 0.65 },
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
  "time travel": {
    weight: 0.7,
    source: "anilist-tags",
    narrative: { narrativeComplexity: 0.8, twistDensity: 0.75 },
    experience: { cognitiveLoad: 0.75 },
  },
  "found family": {
    weight: 0.7,
    source: "anilist-tags",
    emotional: { hope: 0.75, comfort: 0.65 },
    narrative: { relationshipFocus: 0.8, characterFocus: 0.85 },
  },
  "coming of age": {
    weight: 0.65,
    source: "anilist-tags",
    narrative: { characterFocus: 0.85 },
    emotional: { hope: 0.6, melancholy: 0.5, catharsis: 0.6 },
  },
  tragedy: {
    weight: 0.7,
    source: "anilist-tags",
    emotional: { melancholy: 0.85, darkness: 0.75, catharsis: 0.8, hope: 0.25 },
    experience: { emotionalIntensity: 0.85 },
  },
  "anti-hero": {
    weight: 0.65,
    source: "anilist-tags",
    narrative: { moralAmbiguity: 0.85, characterFocus: 0.75 },
    emotional: { darkness: 0.65 },
  },
  politics: {
    weight: 0.7,
    source: "anilist-tags",
    narrative: {
      politicalComplexity: 0.9,
      worldBuilding: 0.7,
      narrativeComplexity: 0.75,
    },
    experience: { cognitiveLoad: 0.8 },
  },
  philosophy: {
    weight: 0.7,
    source: "anilist-tags",
    narrative: { narrativeComplexity: 0.8, moralAmbiguity: 0.75 },
    experience: { cognitiveLoad: 0.85 },
  },
  iyashikei: {
    weight: 0.75,
    source: "anilist-tags",
    emotional: { comfort: 0.95, hope: 0.7, darkness: 0.1 },
    experience: { pacing: 0.2, actionIntensity: 0.1, accessibility: 0.85 },
  },
  "slow burn": {
    weight: 0.7,
    source: "anilist-tags",
    narrative: { slowPayoff: 0.9 },
    experience: { pacing: 0.25 },
  },
  gore: {
    weight: 0.6,
    source: "anilist-tags",
    emotional: { darkness: 0.85 },
    experience: { emotionalIntensity: 0.75, accessibility: 0.3 },
  },
  cyberpunk: {
    weight: 0.65,
    source: "anilist-tags",
    narrative: { worldBuilding: 0.8 },
    style: { atmosphere: 0.8, visualExperimentation: 0.65 },
    emotional: { darkness: 0.55 },
  },
  isekai: {
    weight: 0.55,
    source: "anilist-tags",
    narrative: { worldBuilding: 0.75 },
    emotional: { wonder: 0.65 },
  },
  military: {
    weight: 0.55,
    source: "anilist-tags",
    narrative: { politicalComplexity: 0.7, plotDensity: 0.6 },
    experience: { actionIntensity: 0.65, cognitiveLoad: 0.55 },
  },
  "slow-paced": {
    weight: 0.8,
    source: "deep-tags",
    experience: { pacing: 0.2 },
    narrative: { slowPayoff: 0.85 },
  },
  "fast-paced": {
    weight: 0.8,
    source: "deep-tags",
    experience: { pacing: 0.85 },
  },
  atmospheric: {
    weight: 0.8,
    source: "deep-tags",
    style: { atmosphere: 0.9 },
    experience: { pacing: 0.35 },
  },
  "experimental animation": {
    weight: 0.85,
    source: "deep-tags",
    style: { visualExperimentation: 0.95, tonalVolatility: 0.7 },
  },
  nonlinear: {
    weight: 0.8,
    source: "deep-tags",
    narrative: { narrativeComplexity: 0.9, twistDensity: 0.7 },
    experience: { cognitiveLoad: 0.85 },
  },
  "moral dilemma": {
    weight: 0.8,
    source: "deep-tags",
    narrative: { moralAmbiguity: 0.9 },
    experience: { cognitiveLoad: 0.75 },
  },
  "character study": {
    weight: 0.8,
    source: "deep-tags",
    narrative: { characterFocus: 0.95 },
    experience: { pacing: 0.35 },
  },
  "political intrigue": {
    weight: 0.85,
    source: "deep-tags",
    narrative: { politicalComplexity: 0.95, plotDensity: 0.8 },
    experience: { cognitiveLoad: 0.85 },
  },
  "dialogue driven": {
    weight: 0.75,
    source: "deep-tags",
    style: { dialogueDensity: 0.9 },
  },
  melancholic: {
    weight: 0.75,
    source: "deep-tags",
    emotional: { melancholy: 0.9, comfort: 0.35 },
  },
  heartwarming: {
    weight: 0.75,
    source: "deep-tags",
    emotional: { comfort: 0.9, hope: 0.8, darkness: 0.15 },
  },
  "detailed worldbuilding": {
    weight: 0.8,
    source: "deep-tags",
    narrative: { worldBuilding: 0.95 },
  },
  existential: {
    weight: 0.8,
    source: "deep-tags",
    narrative: { narrativeComplexity: 0.85, moralAmbiguity: 0.7 },
    experience: { cognitiveLoad: 0.85 },
  },
};

const ALIASES: Record<string, string> = {
  "slice-of-life": "slice of life",
  sol: "slice of life",
  "sci fi": "sci-fi",
  "science fiction": "sci-fi",
  scifi: "sci-fi",
  psych: "psychological",
  "slowburn": "slow burn",
  "found-family": "found family",
  "coming-of-age": "coming of age",
  "anti hero": "anti-hero",
  antihero: "anti-hero",
  political: "politics",
  philosophical: "philosophy",
  "time-travel": "time travel",
};

export function evidenceFromLabel(label: string): DimPatch | null {
  const t = norm(label);
  if (!t) return null;
  const key = ALIASES[t] || t;
  if (EVIDENCE_MAP[key]) return { ...EVIDENCE_MAP[key]! };
  for (const [k, patch] of Object.entries(EVIDENCE_MAP)) {
    if (k.length >= 5 && (t.includes(k) || k.includes(t))) {
      return { ...patch, weight: patch.weight * 0.85 };
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
    const b = buckets[group]!;
    for (const [k, val] of Object.entries(partial)) {
      if (typeof val !== "number" || !Number.isFinite(val)) continue;
      if (!b[k]) b[k] = { sum: 0, w: 0 };
      b[k]!.sum += val * w;
      b[k]!.w += w;
      evidenceWeights[`${group}.${k}`] =
        (evidenceWeights[`${group}.${k}`] || 0) + w;
    }
  }

  const SOURCE_PRIORITY: Record<string, number> = {
    "deep-tags": 1.15,
    "anilist-tags": 1.0,
    "synopsis-heuristic": 0.85,
    structure: 0.9,
    "genre-fallback": 0.7,
  };

  const hasStrong = patches.some(
    (x) => x.source !== "genre-fallback" && x.source !== "synopsis-heuristic",
  );
  for (const p of patches) {
    sources.add(p.source);
    let w = p.weight * (SOURCE_PRIORITY[p.source] ?? 1);
    if (p.source === "genre-fallback" && hasStrong) w *= 0.35;
    accumulate("emotional", p.emotional as Record<string, number>, w);
    accumulate("narrative", p.narrative as Record<string, number>, w);
    accumulate("experience", p.experience as Record<string, number>, w);
    accumulate("style", p.style as Record<string, number>, w);
  }

  function apply(group: string, target: Record<string, number>) {
    for (const [k, { sum, w }] of Object.entries(buckets[group]!)) {
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

export function evidenceMapSize(): number {
  return Object.keys(EVIDENCE_MAP).length;
}
