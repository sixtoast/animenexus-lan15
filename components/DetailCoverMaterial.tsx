"use client";

/**
 * Applies resonance material CSS variables on the detail hero cover.
 */

import type { Anime } from "@/lib/types";
import { AnimeImage } from "@/components/AnimeImage";
import {
  materialCssVars,
  materialFromAnimeEntity,
} from "@/lib/anime-material";

export function DetailCoverMaterial({
  anime,
  viewTransitionName,
}: {
  anime: Anime;
  viewTransitionName: string;
}) {
  const vars = materialCssVars(materialFromAnimeEntity(anime));

  return (
    <div
      className="detail-cover-material"
      data-anime-object-id={String(anime.id)}
      style={vars as React.CSSProperties}
    >
      <AnimeImage
        className="detail-cover"
        src={anime.image}
        title={anime.title}
        decorative
        width={280}
        height={400}
        sizes="(max-width: 640px) 40vw, 220px"
        priority
        viewTransitionName={viewTransitionName}
      />
    </div>
  );
}
