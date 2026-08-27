/**
 * AniList manga adapter (Sprint 27).
 * Soft-fail — anime remains primary catalog.
 */

import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import type { MangaSummary } from "../manga-types";

const ANILIST = "https://graphql.anilist.co";

const MANGA_QUERY = `
query ($id: Int) {
  Media(id: $id, type: MANGA) {
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    status
    format
    chapters
    volumes
    startDate { year }
    averageScore
    coverImage { large }
    genres
    siteUrl
  }
}
`;

type AlMedia = {
  id: number;
  idMal?: number | null;
  title?: { romaji?: string; english?: string; native?: string };
  description?: string | null;
  status?: string;
  format?: string;
  chapters?: number | null;
  volumes?: number | null;
  startDate?: { year?: number | null };
  averageScore?: number | null;
  coverImage?: { large?: string };
  genres?: string[];
  siteUrl?: string;
};

function mapMedia(m: AlMedia): MangaSummary {
  const title =
    m.title?.english || m.title?.romaji || m.title?.native || `Manga #${m.id}`;
  return {
    id: m.id,
    title,
    titleRomaji: m.title?.romaji,
    titleNative: m.title?.native,
    description: m.description || undefined,
    status: m.status,
    format: m.format,
    chapters: m.chapters ?? null,
    volumes: m.volumes ?? null,
    year: m.startDate?.year ?? null,
    score: m.averageScore != null ? m.averageScore / 10 : null,
    image: m.coverImage?.large,
    genres: m.genres || [],
    source: "anilist",
    anilistId: m.id,
    malId: m.idMal ?? null,
    url: m.siteUrl,
  };
}

export async function fetchAniListManga(
  id: number,
): Promise<MangaSummary | null> {
  if (!id) return null;
  const key = cacheKey(["manga", "anilist", id]);
  return dedupedFetch(
    key,
    async () => {
      const res = await fetch(ANILIST, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: MANGA_QUERY, variables: { id } }),
        next: { revalidate: 3600 },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        data?: { Media?: AlMedia | null };
        errors?: unknown;
      };
      if (json.errors || !json.data?.Media) return null;
      return mapMedia(json.data.Media);
    },
    CACHE_TTL.medium,
  ).catch(() => null);
}
