/**
 * Image optimisation strategy (Creative Sprint 13).
 *
 * Site-owned → Cloudinary named transforms (f_auto, q_auto, dpr_auto).
 * Catalogue covers (AniList/MAL) → AnimeImage + Next/Image once.
 * Never stack Next optimizer on top of Cloudinary delivery URLs.
 */

import type { CloudinaryNamedTransform } from "./cloudinary";

export type ImageContext =
  | "card"
  | "hero"
  | "avatar"
  | "session-cover"
  | "thumbnail"
  | "social"
  | "sauce-preview";

export type ImageLayout = {
  context: ImageContext;
  transform: CloudinaryNamedTransform;
  /** Intrinsic CSS layout size — always set to prevent CLS */
  width: number;
  height: number;
  sizes: string;
  aspect: string;
};

export const IMAGE_LAYOUTS: Record<ImageContext, ImageLayout> = {
  card: {
    context: "card",
    transform: "nexus-card",
    width: 360,
    height: 540,
    sizes: "(max-width: 640px) 45vw, 180px",
    aspect: "2 / 3",
  },
  hero: {
    context: "hero",
    transform: "nexus-hero",
    width: 960,
    height: 540,
    sizes: "(max-width: 768px) 100vw, 960px",
    aspect: "16 / 9",
  },
  avatar: {
    context: "avatar",
    transform: "nexus-avatar",
    width: 96,
    height: 96,
    sizes: "96px",
    aspect: "1 / 1",
  },
  "session-cover": {
    context: "session-cover",
    transform: "nexus-session-cover",
    width: 1200,
    height: 630,
    sizes: "(max-width: 768px) 100vw, 1200px",
    aspect: "1200 / 630",
  },
  thumbnail: {
    context: "thumbnail",
    transform: "nexus-thumbnail",
    width: 160,
    height: 240,
    sizes: "80px",
    aspect: "2 / 3",
  },
  social: {
    context: "social",
    transform: "nexus-social",
    width: 1200,
    height: 630,
    sizes: "100vw",
    aspect: "1200 / 630",
  },
  "sauce-preview": {
    context: "sauce-preview",
    transform: "nexus-sauce-preview",
    width: 720,
    height: 720,
    sizes: "(max-width: 640px) 100vw, 480px",
    aspect: "1 / 1",
  },
};

export function layoutFor(context: ImageContext): ImageLayout {
  return IMAGE_LAYOUTS[context];
}

/**
 * Catalogue (third-party) covers: optimise once via Next/Image.
 * Cloudinary URLs: pass-through (already f_auto/q_auto).
 */
export type OptimiseOwner = "next" | "cloudinary" | "raw";

export function optimiseOwnerForSrc(src: string): OptimiseOwner {
  const s = src.toLowerCase();
  if (s.includes("res.cloudinary.com") || s.includes("cloudinary.com")) {
    return "cloudinary";
  }
  if (
    s.includes("anilist.co") ||
    s.includes("myanimelist.net") ||
    s.includes("placehold.co")
  ) {
    return "next";
  }
  return "raw";
}
