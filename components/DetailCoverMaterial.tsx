"use client";

import type { Anime } from "@/lib/types";
import { AnimeImage } from "@/components/AnimeImage";
import {
  materialCssVars,
  materialFromAnimeEntity,
} from "@/lib/anime-material";
import {
  getAnimeObjectId,
  getAnimeViewTransitionName,
} from "@/lib/view-transition";

export function DetailCoverMaterial({
  anime,
  viewTransitionName,
}: {
  anime: Anime;
  /** Optional override; defaults to canonical cover name */
  viewTransitionName?: string;
}) {
  const vars = materialCssVars(materialFromAnimeEntity(anime));
  const vt = viewTransitionName ?? getAnimeViewTransitionName(anime.id);

  return (
    <div
      className="detail-cover-material"
      data-anime-object-id={getAnimeObjectId(anime.id)}
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
        viewTransitionName={vt}
      />
    </div>
  );
}
