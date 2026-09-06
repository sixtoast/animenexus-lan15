import type { Anime } from "@/lib/types";
import {
  FINGERPRINT_VERSION,
  clamp01,
  emptyEmotional,
  emptyExperience,
  emptyNarrative,
  emptyStyle,
  type AnimePreferenceFingerprint,
  type FingerprintSource,
} from "./anime-preference-fingerprint";
import {
  evidenceFromLabel,
  mergePatches,
  type DimPatch,
} from "./fingerprint-sources";
import { computeFingerprintConfidence } from "./fingerprint-confidence";
import {
  getCachedFingerprint,
  setCachedFingerprint,
} from "./fingerprint-cache";

export type BuildFingerprintOptions = {
  allowSemanticInference?: boolean;
  forceRefresh?: boolean;
  deepTagNames?: string[];
};

function episodeCount(anime: Anime): number | undefined {
  const n =
    typeof anime.episodes === "number"
      ? anime.episodes
      : parseInt(String(anime.episodes || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function applyStructure(anime: Anime): {
  experience: ReturnType<typeof emptyExperience>;
  structure: AnimePreferenceFingerprint["structure"];
  sources: FingerprintSource[];
} {
  const experience = emptyExperience();
  const eps = episodeCount(anime);
  const duration =
    typeof anime.duration === "number" && anime.duration > 0
      ? anime.duration
      : undefined;
  const format = String(anime.format || "").toUpperCase();

  let commitment = 0.45;
  if (eps != null) {
    if (eps <= 12) commitment = 0.35;
    else if (eps <= 26) commitment = 0.55;
    else if (eps <= 50) commitment = 0.75;
    else commitment = 0.9;
  }
  if (format === "MOVIE") commitment = Math.min(commitment, 0.4);
  if (format === "ONA" || format === "OVA")
    commitment = Math.min(commitment, 0.5);

  experience.commitment = clamp01(commitment);
  experience.episodicVsSerialised = clamp01(
    eps != null ? Math.min(1, eps / 40) : 0.5,
  );
  if (format === "MOVIE") experience.episodicVsSerialised = 0.2;

  const structure: AnimePreferenceFingerprint["structure"] = {
    episodeCount: eps,
    runtimeMinutes: duration,
    format: format || undefined,
    storyCompleteness:
      format === "MOVIE" ? 0.85 : eps && eps <= 13 ? 0.7 : 0.55,
    franchiseCommitment: anime.relations?.length
      ? Math.min(1, 0.4 + anime.relations.length * 0.08)
      : 0.35,
  };

  return { experience, structure, sources: ["structure"] };
}

function synopsisHints(text: string): DimPatch[] {
  const t = (text || "").toLowerCase();
  if (t.length < 40) return [];
  const out: DimPatch[] = [];
  const rules: [RegExp, string][] = [
    [/moral(?:ly)? ambiguous|anti-?hero|grey morality/, "psychological"],
    [/slow[- ]burn|gradually|over time/, "mystery"],
    [/found family|bonds between/, "slice of life"],
    [/political|government conspiracy|war between/, "mecha"],
    [/psychological|identity|mind/, "psychological"],
  ];
  for (const [re, label] of rules) {
    if (!re.test(t)) continue;
    const p = evidenceFromLabel(label);
    if (p) {
      out.push({
        ...p,
        weight: p.weight * 0.45,
        source: "synopsis-heuristic",
      });
    }
  }
  return out;
}

/** Build or return cached fingerprint. Soft-fail: always returns a fingerprint. */
export function buildAnimePreferenceFingerprint(
  anime: Anime,
  options?: BuildFingerprintOptions,
): AnimePreferenceFingerprint {
  if (!options?.forceRefresh) {
    const cached = getCachedFingerprint(anime.id);
    if (cached) return cached;
  }

  const patches: DimPatch[] = [];
  const deepSet = new Set(
    (options?.deepTagNames || []).map((x) => String(x).toLowerCase().trim()),
  );
  const tagSet = new Set(
    (anime.tags || []).map((x) => String(x).toLowerCase().trim()),
  );
  const labels = [
    ...(anime.tags || []),
    anime.genre,
    ...(options?.deepTagNames || []),
  ].filter(Boolean);

  for (const lab of labels) {
    const p = evidenceFromLabel(String(lab));
    if (!p) continue;
    const key = String(lab).toLowerCase().trim();
    const isDeep = deepSet.has(key);
    const isGenreOnly =
      key === String(anime.genre || "").toLowerCase().trim() && !tagSet.has(key);
    let source = p.source;
    let weight = p.weight;
    if (isDeep) {
      source = "deep-tags";
      weight = Math.max(weight, 0.72);
    } else if (isGenreOnly) {
      source = "genre-fallback";
      weight = weight * 0.7;
    } else if (p.source === "genre-fallback" && tagSet.has(key)) {
      source = "anilist-tags";
    }
    patches.push({ ...p, source, weight });
  }

  if (options?.allowSemanticInference !== false && anime.description) {
    patches.push(...synopsisHints(anime.description));
  }

  const struct = applyStructure(anime);
  const merged = mergePatches(
    {
      emotional: emptyEmotional(),
      narrative: emptyNarrative(),
      experience: struct.experience,
      style: emptyStyle(),
    },
    patches,
  );

  merged.experience.commitment = struct.experience.commitment;
  merged.experience.episodicVsSerialised =
    struct.experience.episodicVsSerialised;

  const sourceSet = new Set<FingerprintSource>([
    ...struct.sources,
    ...(merged.sources as FingerprintSource[]),
  ]);

  const confidence = computeFingerprintConfidence({
    sources: [...sourceSet],
    evidenceWeights: merged.evidenceWeights,
  });

  const fp: AnimePreferenceFingerprint = {
    version: FINGERPRINT_VERSION,
    animeId: anime.id,
    emotional: merged.emotional,
    narrative: merged.narrative,
    experience: merged.experience,
    structure: struct.structure,
    style: merged.style,
    confidence,
    provenance: {
      sources: [...sourceSet],
      generatedAt: Date.now(),
    },
  };

  setCachedFingerprint(fp);
  return fp;
}

export function buildFingerprints(
  list: Anime[],
  options?: BuildFingerprintOptions,
): Map<number, AnimePreferenceFingerprint> {
  const m = new Map<number, AnimePreferenceFingerprint>();
  for (const a of list) {
    if (!a?.id) continue;
    m.set(a.id, buildAnimePreferenceFingerprint(a, options));
  }
  return m;
}
