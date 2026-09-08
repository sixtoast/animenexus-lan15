/**
 * Gather motion-room assets for a title:
 * cover, AnimeThemes OP/ED, Fanart stills, title GIFs (Gifukai/nekos.best + optional Tenor/Giphy), trailer.
 * Soft-fail individual sources.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchAnimeThemesByAniListId,
  fetchAnimeThemesByMalId,
  fetchAnimeThemesByTitle,
  type ThemeVideo,
} from "@/lib/providers/animethemes";
import {
  enrichArtworkFromFanart,
  fetchFanartByTvdb,
} from "@/lib/providers/fanart";
import { identityFromAnime, mapId } from "@/lib/anime-identity";
import { searchAnime, fetchAnimeById } from "@/lib/anilist";
import { fetchAnimeDetail } from "@/lib/anilist-detail";
import { searchAnimeGifs } from "@/lib/providers/gif-search";
import type { Anime } from "@/lib/types";

export type MotionAssetDto = {
  id: string;
  kind: "gif" | "video" | "still" | "youtube";
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
  const tvdbOverride = (req.nextUrl.searchParams.get("tvdb") || "").trim();
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
  const displayTitle = anime.title;

  if (anime.image) {
    assets.push({
      id: `poster-${anime.id}`,
      kind: "still",
      url: anime.image,
      thumb: anime.image,
      label: "Cover art",
      source: "anilist",
      animeTitle: displayTitle,
    });
  }

  try {
    const detail = await fetchAnimeDetail(anime.anilist_id || anime.id);
    const tr = detail?.trailer;
    if (tr?.site?.toLowerCase() === "youtube" && tr.id) {
      assets.push({
        id: `yt-${tr.id}`,
        kind: "youtube",
        url: `https://www.youtube.com/embed/${tr.id}`,
        thumb: tr.thumbnail || `https://i.ytimg.com/vi/${tr.id}/hqdefault.jpg`,
        label: "Official trailer",
        source: "anilist-youtube",
        animeTitle: displayTitle,
      });
      notes.push("trailer");
    }
  } catch {
    notes.push("trailer: skip");
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
        const a = themeToAsset(t, displayTitle);
        if (a) assets.push(a);
      }
    } else {
      notes.push("AnimeThemes: no match");
    }
  } catch {
    notes.push("AnimeThemes: failed");
  }

  // Gifukai + nekos.best (no key); optional Tenor/Giphy if env set
  try {
    const { hits, notes: gifNotes } = await searchAnimeGifs(displayTitle, {
      limit: 12,
    });
    notes.push(...gifNotes);
    for (const h of hits) {
      assets.push({
        id: h.id,
        kind: "gif",
        url: h.url,
        thumb: h.thumb,
        label: h.label,
        source: h.source,
        animeTitle: displayTitle,
      });
    }
  } catch {
    notes.push("GIF search failed");
  }

  try {
    let identity = identityFromAnime(anime);
    if (tvdbOverride) {
      identity = mapId(identity, {
        source: "anilist",
        target: "tvdb",
        targetId: tvdbOverride,
        confidence: 0.95,
        method: "manual",
      });
    }
    const fanart = identity.tvdbId
      ? await enrichArtworkFromFanart(identity)
      : tvdbOverride
        ? await fetchFanartByTvdb(tvdbOverride)
        : null;
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
          animeTitle: displayTitle,
        });
      }
    } else if (!identity.tvdbId && !tvdbOverride) {
      notes.push("fanart: need TVDB id (?tvdb= on API or mapping)");
    } else {
      notes.push("fanart: no assets");
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
    gifSearchConfigured: true,
  });
}
