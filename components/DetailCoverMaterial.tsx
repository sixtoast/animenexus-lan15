"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

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
const ROLE_KEY_PREFIX = "animenexus:artwork-role:";

export function DetailCoverMaterial({
  anime,
  viewTransitionName,
}: {
  anime: Anime;
  viewTransitionName?: string;
}) {
  const [cover, setCover] = useState(anime.image);
  const [artworkRole, setArtworkRole] = useState("key-art");
  const [artworkTransition, setArtworkTransition] = useState(false);
  const [previousCover, setPreviousCover] = useState<string | null>(null);
  const coverRef = useRef(cover);
  coverRef.current = cover;

  useEffect(() => {
    const key = `${COVER_KEY_PREFIX}${anime.id}`;
    try {
      const stored = window.localStorage.getItem(key);
      const storedRole = window.localStorage.getItem(`${ROLE_KEY_PREFIX}${anime.id}`) || (stored ? "alternate-art" : "key-art");
      setCover(stored || anime.image);
      setArtworkRole(storedRole);
      document.documentElement.style.setProperty("--detail-artwork-role", storedRole);
      document.documentElement.style.setProperty("--detail-artwork-image", `url("${stored || anime.image}")`);
    } catch {
      setCover(anime.image);
    }

    const onArtworkSelected = (event: Event) => {
      const detail = (event as CustomEvent<{ animeId?: number; url?: string | null; role?: string }>).detail;
      if (detail?.animeId === anime.id) {
        setPreviousCover(coverRef.current);
        setArtworkTransition(true);
        window.setTimeout(() => {
          setArtworkTransition(false);
          setPreviousCover(null);
        }, 760);
        setCover(detail.url || anime.image);
        const role = detail.role || "key-art";
        setArtworkRole(role);
        document.documentElement.style.setProperty("--detail-artwork-role", role);
        document.documentElement.style.setProperty("--detail-artwork-image", `url("${detail.url || anime.image}")`);
        document.documentElement.style.setProperty("--detail-artwork-accent", detail.url ? "1" : "0");
        window.dispatchEvent(new CustomEvent("animenexus:detail-artwork-transition", { detail: { animeId: anime.id, role, url: detail.url || anime.image } }));
      }
    };
    const onDetailArtworkTransition = (event: Event) => {
      const detail = (event as CustomEvent<{ animeId?: number }>).detail;
      if (detail?.animeId !== anime.id) return;
      const page = document.querySelector(".detail-artwork-aware");
      if (!page) return;
      page.classList.remove("is-artwork-transitioning");
      void (page as HTMLElement).offsetWidth;
      page.classList.add("is-artwork-transitioning");
      window.setTimeout(() => page.classList.remove("is-artwork-transitioning"), 980);
    };
    window.addEventListener(COVER_EVENT, onArtworkSelected);
    window.addEventListener("animenexus:detail-artwork-transition", onDetailArtworkTransition);
    return () => {
      window.removeEventListener(COVER_EVENT, onArtworkSelected);
      window.removeEventListener("animenexus:detail-artwork-transition", onDetailArtworkTransition);
      document.documentElement.style.removeProperty("--detail-artwork-role");
      document.documentElement.style.removeProperty("--detail-artwork-image");
      document.documentElement.style.removeProperty("--detail-artwork-accent");
    };
  }, [anime.id, anime.image]);

  const vars = materialCssVars(materialFromAnimeEntity({ ...anime, image: cover }));
  const vt = viewTransitionName ?? getAnimeViewTransitionName(anime.id);

  return (
    <div
      className={`detail-cover-material artwork-role--${artworkRole}${artworkTransition ? " is-artwork-transitioning" : ""}`}
      data-artwork-role={artworkRole}
      data-anime-object-id={getAnimeObjectId(anime.id)}
      style={{
        ...vars,
        "--artwork-role": artworkRole,
        "--artwork-previous-image": previousCover ? `url("${previousCover}")` : "none",
      } as CSSProperties}
    >
      <span className="detail-cover-material__aura" aria-hidden="true" />
      <span className="detail-cover-material__shadow" aria-hidden="true" />
      <span className="detail-cover-material__spine" aria-hidden="true" />
      {previousCover ? <span className="detail-cover-material__previous" aria-hidden="true" /> : null}
      <span className="detail-cover-material__surface">
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
        <span className="detail-cover-material__sheen" aria-hidden="true" />
        <span className="detail-cover-material__edge" aria-hidden="true" />
      </span>
    </div>
  );
}
