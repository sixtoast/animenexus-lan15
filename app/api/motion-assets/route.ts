/**
 * Gather motion-room assets for a title: OP/ED videos + fanart/posters as stills.
 * Soft-fail individual sources.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchAnimeThemesByAniListId,
  fetchAnimeThemesByMalId,
  fetchAnimeThemesByTitle,
  type ThemeVideo,
} from "@/lib/providers/animethemes";
import { enrichArtworkFromFanart } from "@/lib/providers/fanart";
import { identityFromAnime } from "@/lib/anime-identity";
import { searchAnime, fetchAnimeById } from "@/lib/anilist";
import type { Anime } from "@/lib/types";

export type MotionAssetDto = {
  id: string;
  kind: "gif" | "video" | "still";
  url: string;
  thumb?: string;
  label: string;
  source: string;
  animeTitle?: string;
};

function themeToAsset(
  t: ThemeVideo,
  animeTitle?: string,
): MotionAssetDto | null {
  if (!t.videoUrl) return null;
  return {
    id: `theme-${t.slug}-${t.type}`,
    kind: "video",
    url: t.videoUrl,
    label: `${t.type} · ${t.song}`,
    source: "animethemes",
    animeTitle,
  };
}

export async function GET(req: NextRequest) {
  const idRaw = req.nextUrl.searchParams.get("id");
  const title = (req.nextUrl.searchParams.get("title") || "").trim();
  const id = idRaw ? parseInt(idRaw, 10) : NaN;

  let anime: Anime | null = null;
  if (Number.isFinite(id) && id > 0) {
    try {
      anime = await fetchAnimeById(id);
    } catch {
      anime = null;
    }
  }

  if (!anime && title.length >= 2) {
    try {
      const page = await searchAnime(title, 1, 4);
      anime = page.data[0] || null;
    } catch {
      anime = null;
    }
  }

  if (!anime) {
    return NextResponse.json(
      { assets: [], error: "Need a title or AniList id" },
      { status: 400 },
    );
  }

  const assets: MotionAssetDto[] = [];
  const notes: string[] = [];

  if (anime.image) {
    assets.push({
      id: `poster-${anime.id}`,
      kind: "still",
      url: anime.image,
      thumb: anime.image,
      label: "Cover art",
      source: "anilist",
      animeTitle: anime.title,
    });
  }

  try {
    let themes =
      (await fetchAnimeThemesByAniListId(anime.anilist_id || anime.id)) ||
      null;
    if (!themes && anime.idMal) {
      themes = await fetchAnimeThemesByMalId(anime.idMal);
    }
    if (!themes && anime.title) {
      themes = await fetchAnimeThemesByTitle(anime.title);
    }
    if (themes) {
      notes.push(`AnimeThemes (${themes.matchedBy})`);
      for (const t of [
        ...themes.openings,
        ...themes.endings,
        ...themes.inserts,
      ]) {
        const a = themeToAsset(t, anime.title);
        if (a) assets.push(a);
      }
    } else {
      notes.push("AnimeThemes: no match");
    }
  } catch {
    notes.push("AnimeThemes: failed");
  }

  try {
    const identity = identityFromAnime(anime);
    const fanart = await enrichArtworkFromFanart(identity);
    if (fanart?.assets?.length) {
      notes.push("fanart.tv");
      for (const art of fanart.assets.slice(0, 10)) {
        assets.push({
          id: `fanart-${art.type}-${art.url.slice(-24)}`,
          kind: "still",
          url: art.url,
          thumb: art.url,
          label: `Fanart · ${art.type}`,
          source: "fanart",
          animeTitle: anime.title,
        });
      }
    }
  } catch {
    notes.push("fanart: skipped");
  }

  return NextResponse.json({
    anime: {
      id: anime.id,
      title: anime.title,
      image: anime.image,
      year: anime.year,
      format: anime.format,
    },
    assets,
    notes,
  });
}
