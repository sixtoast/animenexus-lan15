"use client";

import Image from "next/image";
import { useState } from "react";
import {
  buildCloudinaryUrl,
  isCloudinaryConfigured,
  type CloudinaryNamedTransform,
} from "@/lib/media/cloudinary";
import {
  layoutFor,
  type ImageContext,
} from "@/lib/media/image-strategy";

export type NexusCloudImageProps = {
  publicId: string;
  alt: string;
  /** Prefer a named context — fills width/height/sizes/transform */
  context?: ImageContext;
  width?: number;
  height?: number;
  transform?: CloudinaryNamedTransform | string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
};

/**
 * Site-owned image via Cloudinary (Sprints 12–13).
 * Uses `unoptimized` so Next does not re-encode Cloudinary f_auto/q_auto URLs.
 * Layout dimensions always explicit → no CLS.
 */
export function NexusCloudImage({
  publicId,
  alt,
  context,
  width: widthProp,
  height: heightProp,
  transform: transformProp,
  className = "",
  sizes: sizesProp,
  priority = false,
  fallbackSrc,
}: NexusCloudImageProps) {
  const layout = context ? layoutFor(context) : null;
  const width = widthProp ?? layout?.width ?? 360;
  const height = heightProp ?? layout?.height ?? 540;
  const transform =
    transformProp ?? layout?.transform ?? ("nexus-card" as CloudinaryNamedTransform);
  const sizes = sizesProp ?? layout?.sizes ?? "(max-width: 640px) 45vw, 180px";

  const [broken, setBroken] = useState(false);
  const cloudUrl =
    !broken && isCloudinaryConfigured()
      ? buildCloudinaryUrl({ publicId, transform })
      : null;
  const src = cloudUrl || fallbackSrc;

  if (!src) {
    return (
      <div
        className={`nx-cloud-img nx-cloud-img--empty ${className}`.trim()}
        style={{
          width,
          height,
          aspectRatio: layout?.aspect,
          background: "rgba(32,24,22,0.4)",
        }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={`nx-cloud-img ${className}`.trim()}
      style={layout?.aspect ? { aspectRatio: layout.aspect, objectFit: "cover" } : undefined}
      priority={priority}
      /* Cloudinary already serves f_auto / q_auto — skip Next re-encode */
      unoptimized={Boolean(cloudUrl)}
      onError={() => setBroken(true)}
    />
  );
}
