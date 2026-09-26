/**
 * AnimeNexus artwork resolver.
 * Free/public sources only: AniList, Kitsu, Jikan/MAL and optional Shikimori.
 * Replaces the Fanart.tv -> TVDB dependency for public artwork.
 */
import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import type { AnimeIdentity } from "../anime-identity";
import type { Anime } from "../types";
import { nowProvenance, type ArtworkAsset, type ArtworkCollection } from "../deep-metadata";

const KITSU_BASE = "https://kitsu.app/api/edge";
const JIKAN_BASE = "https://api.jikan.moe/v4";
const SHIKI_BASE = "https://shikimori.one/api";

type ImageSet = { tiny?: string; small?: string; medium?: string; large?: string; original?: string };
type KitsuRow = {
  id: string;
  attributes?: {
    canonicalTitle?: string;
    titles?: { en?: string; en_jp?: string; ja_jp?: string };
    posterImage?: ImageSet;
    coverImage?: ImageSet;
  };
};

function cleanTitle(value?: string) {
  return (value || "").replace(/[★☆]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function titleMatches(identity: AnimeIdentity, row: KitsuRow) {
  const wanted = [identity.titles.english, identity.titles.romaji, identity.titles.native].map(cleanTitle).filter(Boolean);
  const candidates = [
    row.attributes?.canonicalTitle,
    row.attributes?.titles?.en,
    row.attributes?.titles?.en_jp,
    row.attributes?.titles?.ja_jp,
  ].map(cleanTitle).filter(Boolean);
  return wanted.some((w) => candidates.includes(w));
}

function makeAsset(
  url: string | undefined,
  type: ArtworkAsset["type"],
  source: string,
  provenance: ReturnType<typeof nowProvenance>,
  extra: Partial<ArtworkAsset> = {},
): ArtworkAsset | null {
  if (!url) return null;
  return { url, type, source, provenance, ...extra };
}

async function kitsuArtwork(identity: AnimeIdentity): Promise<ArtworkAsset[]> {
  const query = identity.titles.english || identity.titles.romaji || identity.titles.native;
  if (!query) return [];
  const cacheK = cacheKey(["artwork", "kitsu", cleanTitle(query)]);
  return dedupedFetch(cacheK, async () => {
    try {
      const url = new URL(KITSU_BASE + "/anime");
      url.searchParams.set("filter[text]", query);
      url.searchParams.set("page[limit]", "8");
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/vnd.api+json" },
        next: { revalidate: 86400 },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: KitsuRow[] };
      const row = (json.data || []).find((item) => titleMatches(identity, item)) || json.data?.[0];
      if (!row) return [];
      const exact = titleMatches(identity, row);
      const prov = nowProvenance("kitsu", exact ? 0.94 : 0.72, "title_resolved");
      const poster = row.attributes?.posterImage;
      const cover = row.attributes?.coverImage;
      return [
        makeAsset(poster?.original || poster?.large, "poster", "kitsu", prov, { width: 550, height: 780 }),
        makeAsset(cover?.original || cover?.large, "background", "kitsu", prov, { width: 3360, height: 800 }),
      ].filter(Boolean) as ArtworkAsset[];
    } catch { return []; }
  }, CACHE_TTL.identity);
}

async function jikanArtwork(malId?: number): Promise<ArtworkAsset[]> {
  if (!malId || malId < 1) return [];
  const cacheK = cacheKey(["artwork", "jikan", malId]);
  return dedupedFetch(cacheK, async () => {
    try {
      const res = await fetch(JIKAN_BASE + "/anime/" + malId + "/pictures", { next: { revalidate: 86400 } });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: { jpg?: { image_url?: string; large_image_url?: string }; webp?: { image_url?: string; large_image_url?: string } }[];
      };
      const prov = nowProvenance("jikan", 0.98, "mal_id");
      return (json.data || []).map((row) => {
        const url = row.jpg?.large_image_url || row.webp?.large_image_url || row.jpg?.image_url || row.webp?.image_url;
        return makeAsset(url, "alternate", "jikan", prov);
      }).filter(Boolean).slice(0, 12) as ArtworkAsset[];
    } catch { return []; }
  }, CACHE_TTL.identity);
}

async function shikimoriArtwork(identity: AnimeIdentity): Promise<ArtworkAsset[]> {
  if (!identity.shikimoriId) return [];
  const cacheK = cacheKey(["artwork", "shikimori", identity.shikimoriId]);
  return dedupedFetch(cacheK, async () => {
    try {
      const res = await fetch(
        SHIKI_BASE + "/animes/" + encodeURIComponent(identity.shikimoriId) + "/screenshots",
        {
          headers: {
            "User-Agent": "AnimeNexusLantern/1.0 (github.com/sixtoast/animenexus-lan15)",
            Accept: "application/json",
          },
          next: { revalidate: 86400 },
        },
      );
      if (!res.ok) return [];
      const rows = (await res.json()) as { original?: string; preview?: string }[];
      const prov = nowProvenance("shikimori", 0.98, "verified_id");
      return rows.map((row) => makeAsset(row.original || row.preview, "still", "shikimori", prov))
        .filter(Boolean).slice(0, 8) as ArtworkAsset[];
    } catch { return []; }
  }, CACHE_TTL.identity);
}

export async function enrichArtwork(identity: AnimeIdentity, anime?: Anime): Promise<ArtworkCollection | null> {
  const canonical: ArtworkAsset[] = [];
  if (anime?.image) canonical.push({
    url: anime.image, type: "poster", source: "anilist",
    provenance: nowProvenance("anilist", 1, "canonical_cover"),
  });
  if (anime?.bannerImage) canonical.push({
    url: anime.bannerImage, type: "background", source: "anilist",
    provenance: nowProvenance("anilist", 1, "canonical_banner"),
  });

  const [kitsu, jikan, shiki] = await Promise.all([
    kitsuArtwork(identity),
    jikanArtwork(identity.malId),
    shikimoriArtwork(identity),
  ]);

  const seen = new Set<string>();
  const assets = [...canonical, ...kitsu, ...jikan, ...shiki].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  if (!assets.length) return null;
  return {
    assets,
    provenance: [
      nowProvenance("anilist", 1, "canonical_catalog_art"),
      ...(kitsu.length ? [nowProvenance("kitsu", 0.94, "title_resolved")] : []),
      ...(jikan.length ? [nowProvenance("jikan", 0.98, "mal_id")] : []),
      ...(shiki.length ? [nowProvenance("shikimori", 0.98, "verified_id")] : []),
    ],
  };
}
