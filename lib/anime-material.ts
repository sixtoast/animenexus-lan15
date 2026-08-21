/**
 * Anime Emotional Material (Awwwards Sprint 2).
 * Maps Resonance vectors → restrained visual material — not genre→colour.
 * Heuristic presentation only; never claimed as objective emotion.
 */

import {
  resonanceFromGenres,
  type ResonanceVector,
} from "./resonance";
import type { Anime } from "./types";

export type AnimeMaterialProfile = {
  softness: number;
  energy: number;
  reflectivity: number;
  warmth: number;
  mystery: number;
  weight: number;
  grain: number;
  motionSharpness: number;
};

const clamp01 = (n: number) =>
  Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;

export function emptyMaterial(): AnimeMaterialProfile {
  return {
    softness: 0.45,
    energy: 0.4,
    reflectivity: 0.35,
    warmth: 0.4,
    mystery: 0.3,
    weight: 0.45,
    grain: 0.2,
    motionSharpness: 0.45,
  };
}

/** Map a resonance vector to material properties. */
export function materialFromResonance(v: ResonanceVector): AnimeMaterialProfile {
  const comfort = v.comfort ?? 0;
  const intensity = v.intensity ?? 0;
  const melancholy = v.melancholy ?? 0;
  const wonder = v.wonder ?? 0;
  const mystery = v.mystery ?? 0;
  const energy = v.energy ?? 0;
  const darkness = v.darkness ?? 0;
  const romance = v.romance ?? 0;
  const humour = v.humour ?? 0;
  const nostalgia = v.nostalgia ?? 0;
  const reflection = v.reflection ?? 0;

  return {
    // High comfort → softer edge/light
    softness: clamp01(0.25 + comfort * 0.55 + melancholy * 0.15 - intensity * 0.15),
    // Energy + intensity → firmer motion
    energy: clamp01(0.2 + energy * 0.5 + intensity * 0.35 + humour * 0.1),
    // Wonder + romance → broader bloom / reflect
    reflectivity: clamp01(0.2 + wonder * 0.4 + romance * 0.2 - darkness * 0.15),
    // Warmth from comfort/romance/nostalgia
    warmth: clamp01(0.25 + comfort * 0.25 + romance * 0.3 + nostalgia * 0.25 - darkness * 0.2),
    // Mystery delayed secondary feel
    mystery: clamp01(0.15 + mystery * 0.55 + reflection * 0.2 + darkness * 0.15),
    // Weight from darkness/intensity vs comfort
    weight: clamp01(0.3 + darkness * 0.3 + intensity * 0.25 + melancholy * 0.15 - comfort * 0.15),
    // Grain: melancholy / reflection texture
    grain: clamp01(0.1 + melancholy * 0.35 + reflection * 0.25 + darkness * 0.15),
    // Hover spring sharpness
    motionSharpness: clamp01(
      0.25 + intensity * 0.4 + energy * 0.35 - comfort * 0.2 - melancholy * 0.15,
    ),
  };
}

export function materialFromAnime(anime: {
  tags?: string[];
  genre?: string;
  genres?: string[];
}): AnimeMaterialProfile {
  const genres = [
    ...(anime.genres || []),
    ...(anime.genre ? [anime.genre] : []),
    ...(anime.tags || []),
  ];
  return materialFromResonance(resonanceFromGenres(genres));
}

/** CSS custom properties for AnimeCard / detail (no huge inline blocks). */
export function materialCssVars(
  m: AnimeMaterialProfile,
): Record<string, string> {
  return {
    "--anime-softness": m.softness.toFixed(3),
    "--anime-energy": m.energy.toFixed(3),
    "--anime-warmth": m.warmth.toFixed(3),
    "--anime-reflect": m.reflectivity.toFixed(3),
    "--anime-weight": m.weight.toFixed(3),
    "--anime-mystery": m.mystery.toFixed(3),
    "--anime-grain": m.grain.toFixed(3),
    "--anime-sharp": m.motionSharpness.toFixed(3),
  };
}

export function materialFromAnimeEntity(anime: Anime): AnimeMaterialProfile {
  return materialFromAnime({
    tags: anime.tags,
    genre: anime.genre,
    genres: anime.tags,
  });
}
