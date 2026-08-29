/**
 * Cloudinary URL helpers (Creative Sprint 12).
 *
 * Use for AnimeNexus-owned / ingested media only:
 * session covers, site art, UGC where allowed, processed sauce previews.
 * Do NOT auto-upload third-party catalogue covers (AniList/MAL) without rights review.
 *
 * Secrets (API key/secret) stay server-only — this module only builds delivery URLs
 * from the public cloud name + public IDs.
 */

export type CloudinaryNamedTransform =
  | "nexus-card"
  | "nexus-hero"
  | "nexus-avatar"
  | "nexus-session-cover"
  | "nexus-thumbnail"
  | "nexus-social"
  | "nexus-sauce-preview";

/** Named transforms — keep in sync with Cloudinary console presets when created. */
export const CLOUDINARY_TRANSFORMS: Record<
  CloudinaryNamedTransform,
  string
> = {
  "nexus-card": "c_fill,w_360,h_540,q_auto,f_auto,dpr_auto",
  "nexus-hero": "c_fill,w_960,h_540,q_auto,f_auto,dpr_auto",
  "nexus-avatar": "c_fill,w_96,h_96,q_auto,f_auto,dpr_auto,r_max",
  "nexus-session-cover": "c_fill,w_1200,h_630,q_auto,f_auto",
  "nexus-thumbnail": "c_fill,w_160,h_240,q_auto,f_auto,dpr_auto",
  "nexus-social": "c_fill,w_1200,h_630,q_auto,f_auto",
  "nexus-sauce-preview": "c_limit,w_720,h_720,q_auto,f_auto",
};

export function getCloudinaryCloudName(): string | null {
  const name =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    "";
  const t = name.trim();
  return t || null;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(getCloudinaryCloudName());
}

export type BuildCloudinaryUrlOptions = {
  /** public_id without extension, or full path under the account */
  publicId: string;
  /** Named preset or raw transform string */
  transform?: CloudinaryNamedTransform | string;
  resourceType?: "image" | "video" | "raw";
  /** Optional version number from Cloudinary */
  version?: number | string;
  format?: string;
};

/**
 * Build a delivery URL. Returns null if Cloudinary is not configured.
 * Does not hit the network.
 */
export function buildCloudinaryUrl(
  opts: BuildCloudinaryUrlOptions,
): string | null {
  const cloud = getCloudinaryCloudName();
  if (!cloud) return null;

  const resourceType = opts.resourceType || "image";
  let transform = opts.transform || "q_auto,f_auto";
  if (transform in CLOUDINARY_TRANSFORMS) {
    transform = CLOUDINARY_TRANSFORMS[transform as CloudinaryNamedTransform];
  }

  const id = opts.publicId.replace(/^\/+/, "").replace(/\s+/g, "_");
  const version =
    opts.version != null && String(opts.version).length > 0
      ? `v${opts.version}/`
      : "";
  const fmt = opts.format ? `.${opts.format.replace(/^\./, "")}` : "";

  // https://res.cloudinary.com/<cloud>/<type>/upload/<transform>/<version><id><fmt>
  return `https://res.cloudinary.com/${cloud}/${resourceType}/upload/${transform}/${version}${id}${fmt}`;
}

/** True when URL is already a Cloudinary delivery URL. */
export function isCloudinaryUrl(src: string): boolean {
  try {
    const u = new URL(src);
    return u.hostname.includes("cloudinary.com");
  } catch {
    return false;
  }
}

/**
 * Responsive srcset widths for a public_id (image only).
 * Parent still sets width/height to avoid CLS.
 */
export function cloudinarySrcSet(
  publicId: string,
  widths: number[] = [240, 360, 480, 720, 960],
  baseTransform = "c_fill,q_auto,f_auto,dpr_auto",
): string | null {
  const parts: string[] = [];
  for (const w of widths) {
    const url = buildCloudinaryUrl({
      publicId,
      transform: `${baseTransform},w_${w}`,
    });
    if (!url) return null;
    parts.push(`${url} ${w}w`);
  }
  return parts.join(", ");
}
