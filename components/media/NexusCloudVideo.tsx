"use client";

import {
  buildCloudinaryUrl,
  isCloudinaryConfigured,
} from "@/lib/media/cloudinary";

export type NexusCloudVideoProps = {
  publicId: string;
  className?: string;
  posterPublicId?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  /** Intrinsic layout — avoid CLS */
  width?: number;
  height?: number;
};

/**
 * Site-owned video via Cloudinary delivery (Sprint 12).
 * Soft-fail when not configured — renders nothing rather than a broken player.
 */
export function NexusCloudVideo({
  publicId,
  className = "",
  posterPublicId,
  controls = true,
  autoPlay = false,
  muted = true,
  loop = false,
  width,
  height,
}: NexusCloudVideoProps) {
  if (!isCloudinaryConfigured()) return null;

  const src = buildCloudinaryUrl({
    publicId,
    resourceType: "video",
    transform: "q_auto",
  });
  if (!src) return null;

  const poster = posterPublicId
    ? buildCloudinaryUrl({
        publicId: posterPublicId,
        transform: "nexus-thumbnail",
      }) || undefined
    : undefined;

  return (
    <video
      className={`nx-cloud-video ${className}`.trim()}
      src={src}
      poster={poster}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline
      width={width}
      height={height}
      style={{
        maxWidth: "100%",
        height: height ? undefined : "auto",
      }}
    />
  );
}
