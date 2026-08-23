/**
 * External catalog links for detail (Sprint 22).
 * Only emit links we can justify from known ids — no guessed URLs.
 */

import type { Anime } from "./types";
import { KITSU_ID_OFFSET } from "./providers/kitsu";
import { SHIKI_ID_OFFSET } from "./providers/shikimori";

export type ExternalLink = {
  label: string;
  href: string;
};

export function buildExternalLinks(anime: Anime): ExternalLink[] {
  const links: ExternalLink[] = [];

  if (anime.url && anime.source === "anilist") {
    links.push({ label: "AniList", href: anime.url });
  } else if (anime.anilist_id && anime.anilist_id > 0) {
    links.push({
      label: "AniList",
      href: `https://anilist.co/anime/${anime.anilist_id}`,
    });
  } else if (anime.source === "anilist" && anime.id > 0 && anime.id < KITSU_ID_OFFSET) {
    links.push({
      label: "AniList",
      href: `https://anilist.co/anime/${anime.id}`,
    });
  }

  if (anime.idMal && anime.idMal > 0) {
    links.push({
      label: "MyAnimeList",
      href: `https://myanimelist.net/anime/${anime.idMal}`,
    });
  }

  if (anime.source === "kitsu" && anime.url) {
    links.push({ label: "Kitsu", href: anime.url });
  } else if (anime.id >= KITSU_ID_OFFSET && anime.id < SHIKI_ID_OFFSET) {
    const native = anime.id - KITSU_ID_OFFSET;
    links.push({
      label: "Kitsu",
      href: `https://kitsu.app/anime/${native}`,
    });
  }

  if (anime.source === "shikimori" && anime.url) {
    links.push({ label: "Shikimori", href: anime.url });
  } else if (anime.id >= SHIKI_ID_OFFSET) {
    const native = anime.id - SHIKI_ID_OFFSET;
    links.push({
      label: "Shikimori",
      href: `https://shikimori.one/animes/${native}`,
    });
  }

  // De-dupe by href
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}
