/**
 * Intelligent artwork cropping (Creative Sprint 14).
 *
 * Context-specific gravity/crop strings + optional focal-point overrides
 * (x,y as 0–1 relative to the source image).
 */

import type { ImageContext } from "./image-strategy";

export type FocalPoint = {
  /** 0–1 from left */
  x: number;
  /** 0–1 from top */
  y: number;
};

export type CropSpec = {
  /** Cloudinary crop mode fragment, e.g. c_fill */
  crop: string;
  /** Default gravity when no focal override */
  gravity: string;
  width: number;
  height: number;
  extra?: string;
};

/** Context crop recipes — prefer subject over dead centre. */
export const CROP_SPECS: Record<ImageContext, CropSpec> = {
  card: {
    crop: "c_fill",
    gravity: "g_auto:subject",
    width: 360,
    height: 540,
    extra: "q_auto,f_auto,dpr_auto",
  },
  hero: {
    crop: "c_fill",
    gravity: "g_auto:subject",
    width: 960,
    height: 540,
    extra: "q_auto,f_auto,dpr_auto",
  },
  /** Mobile-first wide band — slightly taller than desktop hero */
  avatar: {
    crop: "c_fill",
    gravity: "g_face",
    width: 96,
    height: 96,
    extra: "q_auto,f_auto,dpr_auto,r_max",
  },
  "session-cover": {
    crop: "c_fill",
    gravity: "g_auto",
    width: 1200,
    height: 630,
    extra: "q_auto,f_auto",
  },
  thumbnail: {
    crop: "c_fill",
    gravity: "g_auto:subject",
    width: 160,
    height: 240,
    extra: "q_auto,f_auto,dpr_auto",
  },
  social: {
    crop: "c_fill",
    gravity: "g_auto",
    width: 1200,
    height: 630,
    extra: "q_auto,f_auto",
  },
  "sauce-preview": {
    crop: "c_limit",
    gravity: "g_center",
    width: 720,
    height: 720,
    extra: "q_auto,f_auto",
  },
};

/** Alternate mobile hero crop (taller / subject-biased). */
export const MOBILE_HERO_CROP: CropSpec = {
  crop: "c_fill",
  gravity: "g_auto:subject",
  width: 720,
  height: 900,
  extra: "q_auto,f_auto,dpr_auto",
};

const FOCAL_KEY = "animenexus.media.focal.v1";

type FocalMap = Record<string, FocalPoint>;

function readFocalMap(): FocalMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(FOCAL_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FocalMap;
  } catch {
    return {};
  }
}

function writeFocalMap(m: FocalMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FOCAL_KEY, JSON.stringify(m));
  } catch {
    /* private mode */
  }
}

export function getFocalPoint(publicId: string): FocalPoint | null {
  const p = readFocalMap()[publicId];
  if (!p) return null;
  if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return null;
  return p;
}

export function setFocalPoint(publicId: string, focal: FocalPoint | null): void {
  const m = readFocalMap();
  if (!focal) delete m[publicId];
  else {
    m[publicId] = {
      x: Math.min(1, Math.max(0, focal.x)),
      y: Math.min(1, Math.max(0, focal.y)),
    };
  }
  writeFocalMap(m);
}

export function listFocalPoints(): FocalMap {
  return readFocalMap();
}

/**
 * Build Cloudinary transform string for a context, applying focal override if set.
 * Focal → g_xy_center with absolute coords in the transform chain.
 */
export function cropTransformFor(
  context: ImageContext,
  publicId?: string,
  opts?: { mobileHero?: boolean; focal?: FocalPoint | null },
): string {
  const spec =
    opts?.mobileHero && context === "hero"
      ? MOBILE_HERO_CROP
      : CROP_SPECS[context];

  const focal =
    opts?.focal !== undefined
      ? opts.focal
      : publicId
        ? getFocalPoint(publicId)
        : null;

  if (focal) {
    // x,y as percent for g_xy_center (Cloudinary uses 0–100 for some APIs;
    // for g_xy_center with x/y params we use relative via custom gravity.
    const px = Math.round(focal.x * 10000) / 100;
    const py = Math.round(focal.y * 10000) / 100;
    return [
      spec.crop,
      `g_xy_center,x_${px}p,y_${py}p`,
      `w_${spec.width}`,
      `h_${spec.height}`,
      spec.extra || "q_auto,f_auto",
    ].join(",");
  }

  return [
    spec.crop,
    spec.gravity,
    `w_${spec.width}`,
    `h_${spec.height}`,
    spec.extra || "q_auto,f_auto",
  ].join(",");
}

/** All variant transforms for CropLab inspection. */
export function cropVariantsFor(
  publicId: string,
): { label: string; transform: string; context: ImageContext | "mobile-hero" }[] {
  const contexts = Object.keys(CROP_SPECS) as ImageContext[];
  const out: {
    label: string;
    transform: string;
    context: ImageContext | "mobile-hero";
  }[] = [];
  for (const c of contexts) {
    out.push({
      label: c,
      context: c,
      transform: cropTransformFor(c, publicId),
    });
  }
  out.push({
    label: "mobile-hero",
    context: "mobile-hero",
    transform: cropTransformFor("hero", publicId, { mobileHero: true }),
  });
  return out;
}
