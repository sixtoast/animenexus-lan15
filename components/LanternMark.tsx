"use client";

import { useId } from "react";

/**
 * AnimeNexus brand mark — lantern silhouette + nexus aperture.
 * The inner aperture is intentionally asymmetrical so the mark remains
 * recognisable without the AnimeNexus wordmark.
 */
type Props = {
  className?: string;
  title?: string;
};

export function LanternMark({ className, title }: Props) {
  const uid = useId().replace(/:/g, "");
  const shellId = `${uid}-shell`;
  const coreId = `${uid}-core`;
  const glowId = `${uid}-glow`;
  const ringId = `${uid}-ring`;

  return (
    <svg
      className={className}
      viewBox="0 0 64 80"
      width="64"
      height="80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M21.5 14.5C21.5 6.8 26.2 2 32 2s10.5 4.8 10.5 12.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        opacity="0.92"
      />

      <path
        d="M17 17.5h30l-3.5 6H20.5l-3.5-6Z"
        fill="currentColor"
        opacity="0.88"
      />

      <path
        d="M18.8 23.5h26.4c3.2 0 5.3 2.7 4.8 5.8l-5.2 32.1c-.45 2.8-2.85 4.85-5.7 4.85H24.9c-2.85 0-5.25-2.05-5.7-4.85L14 29.3c-.5-3.1 1.6-5.8 4.8-5.8Z"
        fill={`url(#${shellId})`}
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M18.2 34h4.6M41.2 34h4.6M19.7 52h4.1M40.2 52h4.1"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        opacity="0.55"
      />

      <path
        d="M24.3 39.1a10.4 10.4 0 0 1 15.4-2.8M39.7 48.9a10.4 10.4 0 0 1-15.4 2.8"
        stroke={`url(#${ringId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M25.7 50.2 38.3 37.8"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        opacity="0.82"
      />

      <circle cx="32" cy="44" r="8.7" fill={`url(#${glowId})`} opacity="0.68" />
      <path
        d="M32 36.8c3.8 4.1 4.7 6.45 3.1 9.4-1.05 1.95-2.55 3.05-3.1 3.4-.55-.35-2.05-1.45-3.1-3.4-1.6-2.95-.7-5.3 3.1-9.4Z"
        fill={`url(#${coreId})`}
      />

      <path
        d="M19.8 66h24.4l-2.35 6H22.15l-2.35-6Z"
        fill="currentColor"
        opacity="0.84"
      />

      <defs>
        <linearGradient id={shellId} x1="32" y1="23.5" x2="32" y2="66.25">
          <stop offset="0%" stopColor="#e8a598" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#e8a598" stopOpacity="0.055" />
          <stop offset="100%" stopColor="#e8a598" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={ringId} x1="24" y1="36" x2="41" y2="53">
          <stop offset="0%" stopColor="#fff0df" />
          <stop offset="50%" stopColor="#f2c891" />
          <stop offset="100%" stopColor="#e8a598" />
        </linearGradient>
        <radialGradient id={coreId} cx="36%" cy="26%" r="76%">
          <stop offset="0%" stopColor="#fff9ef" />
          <stop offset="43%" stopColor="#ffe5b4" />
          <stop offset="100%" stopColor="#e8a598" />
        </radialGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe5b4" stopOpacity="0.55" />
          <stop offset="62%" stopColor="#e8a598" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#e8a598" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
