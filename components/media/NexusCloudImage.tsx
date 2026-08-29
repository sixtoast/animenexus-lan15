"use client";

import Image from "next/image";
import { useState } from "react";
import {
  buildCloudinaryUrl,
  isCloudinaryConfigured,
  type CloudinaryNamedTransform,
} from "@/lib/media/cloudinary";

export type NexusCloudImageProps = {
  publicId: string;
  alt: string;
  width: number;
  height: number;
  transform?: CloudinaryNamedTransform | string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Fallback when Cloudinary is not configured or load fails */
  fallbackSrc?: string;
};

/**
 * Site-owned / ingested image via Cloudinary (Sprint 12).
 * Known layout size required — prevents CLS.
 * Third-party catalogue covers should keep using AnimeImage.
 */
export function NexusCloudImage({
  publicId,
  alt,
  width,
  height,
  transform = "nexus-card",
  className = "",
  sizes = "(max-width: 640px) 45vw, 180px",
  priority = false,
  fallbackSrc,
}: NexusCloudImageProps) {
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
        style={{ width, height }}
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
      priority={priority}
      onError={() => setBroken(true)}
    />
  );
}
