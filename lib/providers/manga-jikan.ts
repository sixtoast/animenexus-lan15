/**
 * Jikan / MAL manga adapter (Sprint 27).
 * Soft-fail when Jikan is down.
 */

import { CACHE_TTL, cacheKey, dedupedFetch } from "../api-cache";
import { withProviderLimit } from "../provider-rate-limit";
import type { MangaSummary } from "../manga-types";

const BASE = "https://api.jikan.moe/v4";

type JikanManga = {
  mal_id: number;
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
  status?: string;
  type?: string;
  chapters?: number | null;
  volumes?: number | null;
  published?: { from?: string | null };
  score?: number | null;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  genres?: { name: string }[];
  url?: string;
};

function mapJikan(m: JikanManga): MangaSummary {
  const year = m.published?.from
    ? parseInt(m.published.from.slice(0, 4), 10) || null
    : null;
  return {
    id: m.mal_id,
    title: m.title_english || m.title || `Manga #${m.mal_id}`,
    titleRomaji: m.title,
    titleNative: m.title_japanese || undefined,
    description: m.synopsis || undefined,
    status: m.status,
    format: m.type,
    chapters: m.chapters ?? null,
    volumes: m.volumes ?? null,
    year,
    score: m.score ?? null,
    image: m.images?.jpg?.large_image_url || m.images?.jpg?.image_url,
    genres: (m.genres || []).map((g) => g.name),
    source: "jikan",
    malId: m.mal_id,
    url: m.url,
  };
}

export async function fetchJikanManga(
  malId: number,
): Promise<MangaSummary | null> {
  if (!malId) return null;
  const key = cacheKey(["manga", "jikan", malId]);
  return dedupedFetch(
    key,
    async () => {
      const res = await withProviderLimit("jikan", () =>
        fetch(`${BASE}/manga/${malId}`, {
          headers: { Accept: "application/json" },
          next: { revalidate: 3600 },
        }),
      ).catch(() => null);
      if (!res || !res.ok) return null;
      const json = (await res.json()) as { data?: JikanManga };
      if (!json.data) return null;
      return mapJikan(json.data);
    },
    CACHE_TTL.medium,
  ).catch(() => null);
}
