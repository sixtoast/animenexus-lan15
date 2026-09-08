/**
 * Random SFW anime GIFs for Motion sample board (Gifukai + nekos.best).
 */

import { NextResponse } from "next/server";
import { fetchSampleGifs } from "@/lib/providers/gif-search";

export async function GET() {
  try {
    const hits = await fetchSampleGifs(14);
    return NextResponse.json({
      assets: hits.map((h) => ({
        id: h.id,
        kind: "gif" as const,
        url: h.url,
        thumb: h.thumb || h.url,
        label: h.label,
        source: h.source,
        animeTitle: h.animeName,
      })),
      notes: hits.length
        ? [`${hits.length} samples · Gifukai / nekos.best`]
        : ["No samples returned"],
    });
  } catch (e) {
    return NextResponse.json(
      {
        assets: [],
        notes: [e instanceof Error ? e.message : "sample fetch failed"],
      },
      { status: 502 },
    );
  }
}
