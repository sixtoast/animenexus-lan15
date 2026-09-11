import type { EvidenceSource, SourceFamily, SemanticTerm } from "./types";

export function sourceFamilyOf(source: EvidenceSource): SourceFamily {
  if (source === "jikan" || source === "mal_official") return "mal";
  if (source === "anilist") return "anilist";
  if (source === "kitsu") return "kitsu";
  if (source === "shikimori") return "shikimori";
  return "simkl";
}

/** Unique independent source families that supplied a given term name. */
export function independentFamiliesForTerm(
  terms: SemanticTerm[],
  name: string,
): SourceFamily[] {
  const n = name.trim().toLowerCase();
  const set = new Set<SourceFamily>();
  for (const t of terms) {
    if (t.name.trim().toLowerCase() === n) set.add(t.sourceFamily);
  }
  return [...set];
}

/**
 * Corroboration strength from independent families (0..1).
 * MAL jikan + MAL official count as one family.
 */
export function corroborationStrength(families: SourceFamily[]): number {
  const n = families.length;
  if (n <= 0) return 0;
  if (n === 1) return 0.55;
  if (n === 2) return 0.78;
  return 0.92;
}
