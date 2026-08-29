"use client";

import Image from "next/image";
import { useState } from "react";
import {
  buildCloudinaryUrl,
  isCloudinaryConfigured,
  type CloudinaryNamedTransform,
} from "@/lib/media/cloudinary";
import { cropTransformFor } from "@/lib/media/crop";
import {
  layoutFor,
  type ImageContext,
} from "@/lib/media/image-strategy";

export type NexusCloudImageProps = {
  publicId: string;
  alt: string;
  /** Prefer a named context — fills width/height/sizes + intelligent crop */
  context?: ImageContext;
  width?: number;
  height?: number;
  transform?: CloudinaryNamedTransform | string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
  /** Prefer mobile-hero crop when context is hero */
  mobileHero?: boolean;
};

/**
 * Site-owned image via Cloudinary (Sprints 12–14).
 * Context crops use subject gravity + optional focal overrides.
 * `unoptimized` when Cloudinary URL — no double encode.
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
  mobileHero = false,
}: NexusCloudImageProps) {
  const layout = context ? layoutFor(context) : null;
  const width = widthProp ?? layout?.width ?? 360;
  const height = heightProp ?? layout?.height ?? 540;
  const sizes = sizesProp ?? layout?.sizes ?? "(max-width: 640px) 45vw, 180px";

  const transform =
    transformProp ??
    (context
      ? cropTransformFor(context, publicId, { mobileHero })
      : ("nexus-card" as CloudinaryNamedTransform));

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
      style={
        layout?.aspect
          ? { aspectRatio: layout.aspect, objectFit: "cover" }
          : undefined
      }
      priority={priority}
      unoptimized={Boolean(cloudUrl)}
      onError={() => setBroken(true)}
    />
  );
}
