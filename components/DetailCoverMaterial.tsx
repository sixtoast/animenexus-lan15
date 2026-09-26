"use client";

import { useEffect, useState } from "react";

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

const COVER_KEY_PREFIX = "animenexus:artwork-cover:";
const COVER_EVENT = "animenexus:artwork-selected";

export function DetailCoverMaterial({
  anime,
  viewTransitionName,
}: {
  anime: Anime;
  viewTransitionName?: string;
}) {
  const [cover, setCover] = useState(anime.image);

  useEffect(() => {
    const key = `${COVER_KEY_PREFIX}${anime.id}`;
    try {
      setCover(window.localStorage.getItem(key) || anime.image);
    } catch {
      setCover(anime.image);
    }

    const onArtworkSelected = (event: Event) => {
      const detail = (event as CustomEvent<{ animeId?: number; url?: string | null }>).detail;
      if (detail?.animeId === anime.id) {
        setCover(detail.url || anime.image);
        document.documentElement.style.setProperty(
          "--detail-artwork-accent",
          detail.url ? "1" : "0",
        );
      }
    };
    window.addEventListener(COVER_EVENT, onArtworkSelected);
    return () => window.removeEventListener(COVER_EVENT, onArtworkSelected);
  }, [anime.id, anime.image]);

  const vars = materialCssVars(materialFromAnimeEntity({ ...anime, image: cover }));
  const vt = viewTransitionName ?? getAnimeViewTransitionName(anime.id);

  return (
    <div
      className="detail-cover-material"
      data-anime-object-id={getAnimeObjectId(anime.id)}
      style={vars as React.CSSProperties}
    >
      <AnimeImage
        className="detail-cover"
        src={cover}
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
