/**
 * Central enrichment for fingerprints — gathers label evidence beyond bare genres.
 */

import type { Anime } from "@/lib/types";
import type { DeepTag } from "@/lib/deep-metadata";
import { deepSignals } from "@/lib/deep-tags";
import {
  enrichDeepFromAniDb,
  isAniDbConfigured,
} from "@/lib/providers/anidb";
import { identityFromAnime, type AnimeIdentity } from "@/lib/anime-identity";
import {
  buildAnimePreferenceFingerprint,
  type BuildFingerprintOptions,
} from "./fingerprint-builder";
import type { AnimePreferenceFingerprint } from "./anime-preference-fingerprint";

export function collectFingerprintLabels(
  anime: Anime,
  deepTags?: DeepTag[],
): { anilistLabels: string[]; deepTagNames: string[] } {
  const anilistLabels: string[] = [];
  if (anime.genre) anilistLabels.push(String(anime.genre));
  for (const t of anime.tags || []) {
    if (t) anilistLabels.push(String(t));
  }
  for (const t of (anime as { genres?: string[] }).genres || []) {
    if (t) anilistLabels.push(String(t));
  }

  const deepTagNames: string[] = [];
  if (deepTags?.length) {
    for (const t of deepSignals(deepTags, 24)) {
      if (t.name) deepTagNames.push(t.name);
    }
    for (const t of deepTags) {
      if (!t.name || t.spoiler) continue;
      if (t.weight != null && t.weight < 120) continue;
      deepTagNames.push(t.name);
    }
  }

  const dedupe = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of arr) {
      const k = s.toLowerCase().trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(s.trim());
    }
    return out;
  };

  return {
    anilistLabels: dedupe(anilistLabels),
    deepTagNames: dedupe(deepTagNames),
  };
}

export function buildEnrichedFingerprint(
  anime: Anime,
  opts?: BuildFingerprintOptions & { deepTags?: DeepTag[] },
): AnimePreferenceFingerprint {
  const { deepTagNames } = collectFingerprintLabels(anime, opts?.deepTags);
  const mergedDeep = [...(opts?.deepTagNames || []), ...deepTagNames];
  return buildAnimePreferenceFingerprint(anime, {
    ...opts,
    deepTagNames: mergedDeep.length ? mergedDeep : undefined,
  });
}

export async function buildEnrichedFingerprintAsync(
  anime: Anime,
  opts?: BuildFingerprintOptions & {
    deepTags?: DeepTag[];
    identity?: AnimeIdentity;
  },
): Promise<AnimePreferenceFingerprint> {
  let deepTags = opts?.deepTags ? [...opts.deepTags] : [];

  if (isAniDbConfigured()) {
    try {
      const identity = opts?.identity || identityFromAnime(anime);
      const deep = await enrichDeepFromAniDb(identity);
      if (deep?.tags?.length) {
        deepTags = [...deepTags, ...deep.tags];
      }
    } catch {
      /* soft */
    }
  }

  return buildEnrichedFingerprint(anime, {
    ...opts,
    deepTags,
  });
}
