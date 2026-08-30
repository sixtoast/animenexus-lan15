/**
 * Cloudinary URL helpers (Creative Sprints 12–13 + 43 consistency).
 *
 * Site-owned / ingested media only. Named transforms include f_auto, q_auto,
 * and dpr_auto where appropriate so Next/Image should NOT re-optimise.
 */

export type CloudinaryNamedTransform =
  | "nexus-card"
  | "nexus-hero"
  | "nexus-avatar"
  | "nexus-session-cover"
  | "nexus-thumbnail"
  | "nexus-social"
  | "nexus-sauce-preview";

/** Named transforms — mirror in Cloudinary console when ready. */
export const CLOUDINARY_TRANSFORMS: Record<
  CloudinaryNamedTransform,
  string
> = {
  "nexus-card": "c_fill,g_auto:subject,w_360,h_540,q_auto,f_auto,dpr_auto",
  "nexus-hero": "c_fill,g_auto:subject,w_1280,h_720,q_auto,f_auto,dpr_auto",
  "nexus-avatar": "c_fill,g_face,w_96,h_96,q_auto,f_auto,dpr_auto,r_max",
  "nexus-session-cover": "c_fill,g_auto,w_1200,h_630,q_auto,f_auto",
  "nexus-thumbnail": "c_fill,g_auto:subject,w_160,h_240,q_auto,f_auto,dpr_auto",
  "nexus-social": "c_fill,g_auto,w_1200,h_630,q_auto,f_auto",
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
  publicId: string;
  transform?: CloudinaryNamedTransform | string;
  resourceType?: "image" | "video" | "raw";
  version?: number | string;
  format?: string;
  /** Override width for responsive variants */
  width?: number;
};

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
  if (opts.width && opts.width > 0) {
    if (!/\bw_\d+/.test(transform)) {
      transform = `${transform},w_${Math.round(opts.width)}`;
    } else {
      transform = transform.replace(/\bw_\d+/, `w_${Math.round(opts.width)}`);
    }
  }

  const id = opts.publicId.replace(/^\/+/, "").replace(/\s+/g, "_");
  const version =
    opts.version != null && String(opts.version).length > 0
      ? `v${opts.version}/`
      : "";
  const fmt = opts.format ? `.${opts.format.replace(/^\./, "")}` : "";

  return `https://res.cloudinary.com/${cloud}/${resourceType}/upload/${transform}/${version}${id}${fmt}`;
}

export function isCloudinaryUrl(src: string): boolean {
  try {
    const u = new URL(src);
    return u.hostname.includes("cloudinary.com");
  } catch {
    return false;
  }
}

export function cloudinarySrcSet(
  publicId: string,
  widths: number[] = [240, 360, 480, 720, 960],
  baseTransform = "c_fill,g_auto:subject,q_auto,f_auto,dpr_auto",
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
