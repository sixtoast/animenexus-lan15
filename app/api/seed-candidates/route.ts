/**
 * Seed-driven candidates: Shikimori similar + Jikan recommendations + optional AniList links.
 */
import { NextRequest, NextResponse } from "next/server";
import type { Anime } from "@/lib/types";
import {
  fetchFallbackRecommendations,
  fetchShikimoriSimilar,
  fetchJikanRecommendations,
  resolveMalIdFromAnilist,
  type FallbackRec,
} from "@/lib/providers/recommendation-fallback";
import { SHIKI_ID_OFFSET } from "@/lib/providers/shikimori";

function recToAnime(r: FallbackRec, source: string): Anime {
  const mal = r.id > SHIKI_ID_OFFSET ? r.id - SHIKI_ID_OFFSET : r.id;
  return {
    id: r.id,
    title: r.title,
    description: "",
    genre: "N/A",
    tags: [],
    status: (r.status as Anime["status"]) || "FINISHED",
    format: (r.format as Anime["format"]) || "TV",
    year: r.year ?? "?",
    score: r.score ?? 0,
    popularity: 0,
    image: r.image || "",
    anilist_id: 0,
    idMal: mal,
    episodes: "?",
    duration: 0,
    isAdult: false,
    source: source as Anime["source"],
  };
}

export async function GET(req: NextRequest) {
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  let malId = parseInt(req.nextUrl.searchParams.get("malId") || "", 10);
  const limit = Math.min(
    24,
    parseInt(req.nextUrl.searchParams.get("limit") || "16", 10) || 16,
  );

  if ((!id || Number.isNaN(id)) && (!malId || Number.isNaN(malId))) {
    return NextResponse.json(
      { error: "id or malId required", data: [] },
      { status: 400 },
    );
  }

  const sources: string[] = [];
  const byKey = new Map<number, Anime>();

  function ingest(list: FallbackRec[], source: string) {
    sources.push(source);
    for (const r of list) {
      if (!r?.id || byKey.has(r.id)) continue;
      byKey.set(r.id, recToAnime(r, source));
    }
  }

  if ((!malId || Number.isNaN(malId) || malId < 1) && id > 0) {
    try {
      const resolved = await resolveMalIdFromAnilist(id);
      if (resolved && resolved > 0) malId = resolved;
    } catch {
      /* isolate */
    }
  }

  if (malId > 0) {
    try {
      const shiki = await fetchShikimoriSimilar(malId, limit);
      if (shiki.length) ingest(shiki, "shikimori_similar");
    } catch {
      /* isolate */
    }
    try {
      const jikan = await fetchJikanRecommendations(malId, limit);
      if (jikan.length) ingest(jikan, "jikan_recommendations");
    } catch {
      /* isolate */
    }
    if (!byKey.size) {
      try {
        const fb = await fetchFallbackRecommendations(malId, limit);
        ingest(fb, "fallback_recommendations");
      } catch {
        /* isolate */
      }
    }
  }

  if (id > 0 && id < SHIKI_ID_OFFSET) {
    try {
      const { fetchMediaLinks } = await import("@/lib/anilist-detail");
      const links = await fetchMediaLinks(id);
      sources.push("anilist_links");
      for (const rel of [
        ...(links.recommendations || []),
        ...(links.relations || []),
      ]) {
        if (!rel?.id || byKey.has(rel.id)) continue;
        byKey.set(rel.id, {
          id: rel.id,
          title: rel.title,
          description: "",
          genre: "N/A",
          tags: [],
          status: (rel.status as Anime["status"]) || "FINISHED",
          format: (rel.format as Anime["format"]) || "TV",
          year: rel.year ?? "?",
          score: rel.score ?? 0,
          popularity: 0,
          image: rel.image || "",
          anilist_id: rel.id,
          episodes: "?",
          duration: 0,
          isAdult: false,
        });
      }
    } catch {
      /* AniList may be down */
    }
  }

  const data = [...byKey.values()].slice(0, limit * 2);
  return NextResponse.json({
    data,
    sources,
    malId: malId > 0 ? malId : null,
    count: data.length,
  });
}
