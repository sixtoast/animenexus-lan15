import {
  FINGERPRINT_VERSION,
  type AnimePreferenceFingerprint,
} from "./anime-preference-fingerprint";

const mem = new Map<string, AnimePreferenceFingerprint>();
const LS_PREFIX = "an_fp_v1:";

function key(animeId: number): string {
  return `${animeId}:${FINGERPRINT_VERSION}`;
}

export function getCachedFingerprint(
  animeId: number,
): AnimePreferenceFingerprint | null {
  const k = key(animeId);
  const hit = mem.get(k);
  if (hit) return hit;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + k);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnimePreferenceFingerprint;
    if (parsed?.version !== FINGERPRINT_VERSION) return null;
    mem.set(k, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedFingerprint(fp: AnimePreferenceFingerprint): void {
  const k = key(fp.animeId);
  mem.set(k, fp);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + k, JSON.stringify(fp));
  } catch {
    /* quota */
  }
}

export function clearFingerprintCache(): void {
  mem.clear();
}
