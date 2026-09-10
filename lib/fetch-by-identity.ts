/**
 * Canonical detail resolver — NEVER send a Kitsu/Shikimori/MAL id to AniList as Media(id:…).
 */

import type { Anime } from "./types";
import type { AnimeIdentity } from "./anime-identity";
import { ensureNexusId, parseNexusId } from "./anime-identity";
import { fetchAnimeById } from "./anilist";
import { KITSU_ID_OFFSET } from "./providers/kitsu";
import { SHIKI_ID_OFFSET } from "./providers/shikimori";

export class IdentityResolutionError extends Error {
  constructor(
    message: string,
    public identity: AnimeIdentity,
  ) {
    super(message);
    this.name = "IdentityResolutionError";
  }
}

export async function fetchAnimeByIdentity(
  identity: AnimeIdentity,
): Promise<Anime> {
  const id = ensureNexusId(identity);

  if (id.anilistId != null && id.anilistId > 0) {
    const anime = await fetchAnimeById(id.anilistId);
    if (anime) return anime;
  }

  if (id.kitsuId) {
    try {
      const mod = await import("./providers/kitsu");
      const fn = (mod as { fetchKitsuAnimeById?: (id: string) => Promise<Anime | null> })
        .fetchKitsuAnimeById;
      if (fn) {
        const anime = await fn(String(id.kitsuId));
        if (anime) return anime;
      }
    } catch {
      /* optional */
    }
  }

  if (id.shikimoriId) {
    try {
      const mod = await import("./providers/shikimori");
      const fn = (
        mod as { fetchShikimoriAnimeById?: (id: number) => Promise<Anime | null> }
      ).fetchShikimoriAnimeById;
      if (fn) {
        const anime = await fn(Number(id.shikimoriId));
        if (anime) return anime;
      }
    } catch {
      /* optional */
    }
  }

  const nexus = id.nexusId ?? "";
  const parsed = nexus ? parseNexusId(nexus) : null;
  if (parsed?.provider === "anilist") {
    const n = Number(parsed.id);
    if (Number.isFinite(n) && n > 0) {
      const anime = await fetchAnimeById(n);
      if (anime) return anime;
    }
  }

  throw new IdentityResolutionError(
    `Cannot resolve identity ${nexus || "(unknown)"} — no usable provider id`,
    id,
  );
}

/** Resolve route ids that may be AniList or offset Kitsu/Shikimori. */
export async function fetchAnimeByLooseId(rawId: number): Promise<Anime | null> {
  if (!Number.isFinite(rawId) || rawId <= 0) return null;

  if (rawId >= SHIKI_ID_OFFSET) {
    const native = rawId - SHIKI_ID_OFFSET;
    return fetchAnimeByIdentity({
      nexusId: `shikimori:${native}`,
      anilistId: null,
      shikimoriId: String(native),
      titles: {},
      confidence: { shikimori: 1 },
      mappings: [],
      origin: "shikimori",
    }).catch(() => null);
  }

  if (rawId >= KITSU_ID_OFFSET) {
    const native = rawId - KITSU_ID_OFFSET;
    return fetchAnimeByIdentity({
      nexusId: `kitsu:${native}`,
      anilistId: null,
      kitsuId: String(native),
      titles: {},
      confidence: { kitsu: 1 },
      mappings: [],
      origin: "kitsu",
    }).catch(() => null);
  }

  return fetchAnimeById(rawId);
}
