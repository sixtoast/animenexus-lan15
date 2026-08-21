"use client";

/**
 * AnimeImage (Sprint 31).
 * Single cover abstraction: fallback, aspect, lazy, optional Next optimizer,
 * view-transition name, decorative vs content alt.
 */

import Image from "next/image";
import { useState } from "react";

const PLACEHOLDER =
  "https://placehold.co/300x450/1a1a1a/555?text=AnimeNexus";

function canOptimize(src: string): boolean {
  return (
    src.includes("anilist.co") ||
    src.includes("myanimelist.net") ||
    src.includes("placehold.co")
  );
}

export type AnimeImageProps = {
  src?: string | null;
  /** Visible title for accessible alt when contentful */
  title?: string;
  /** Decorative (default) — alt=""; set contentful for meaningful alt */
  decorative?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  /** CSS aspect-ratio, e.g. "2 / 3" */
  aspect?: string;
  /** view-transition-name for shared element morph */
  viewTransitionName?: string;
  priority?: boolean;
  fill?: boolean;
};

export function AnimeImage({
  src,
  title,
  decorative = true,
  width = 300,
  height = 450,
  sizes = "(max-width: 640px) 45vw, 180px",
  className = "",
  aspect = "2 / 3",
  viewTransitionName,
  priority = false,
  fill = false,
}: AnimeImageProps) {
  const [broken, setBroken] = useState(false);
  const resolved =
    broken || !src || src.trim() === "" ? PLACEHOLDER : src.trim();
  const alt = decorative ? "" : title ? title : "Anime cover";
  const style: React.CSSProperties = {
    aspectRatio: fill ? undefined : aspect,
    objectFit: "cover",
    width: fill ? "100%" : undefined,
    height: fill ? "100%" : undefined,
    ...(viewTransitionName
      ? ({ viewTransitionName } as React.CSSProperties)
      : {}),
  };

  if (canOptimize(resolved) && !fill) {
    return (
      <Image
        src={resolved}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={className}
        style={style}
        priority={priority}
        onError={() => setBroken(true)}
      />
    );
  }

  if (canOptimize(resolved) && fill) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        style={{ objectFit: "cover", ...style }}
        priority={priority}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={style}
      onError={() => setBroken(true)}
    />
  );
}
