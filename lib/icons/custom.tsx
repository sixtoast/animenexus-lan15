/**
 * Proprietary AnimeNexus SVG family (Creative Sprint 21).
 *
 * Distinct geometry for product concepts — not generic library swaps.
 * Shared language: viewBox 24, stroke 1.75, round caps, soft rings.
 */

import type { ReactNode } from "react";
import type { NexusIconName } from "./registry";

export const CUSTOM_ICON_SVG: Partial<Record<NexusIconName, ReactNode>> = {
  /** Lantern Seal — outer ring + warm core */
  seal: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2.75" fill="currentColor" />
    </>
  ),
  /** Signal — soft broadcast arcs */
  signal: (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M4 15c2.5-4 5-6 8-6s5.5 2 8 6"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M6.5 17.5c1.8-2.8 3.5-4 5.5-4s3.7 1.2 5.5 4"
      />
      <circle cx="12" cy="20" r="1.35" fill="currentColor" />
    </>
  ),
  /** Resonance — harmonic bars */
  resonance: (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M5 12v0" />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M5 8v8M9 6v12M13 4v16M17 7v10M21 10v4" />
    </>
  ),
  /** Frequency — stepped meter */
  frequency: (
    <>
      <rect x="3" y="14" width="3.5" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="10" width="3.5" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="6" width="3.5" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="18" y="3" width="3.5" height="17" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  /** Living Shelf — shelves with a living pulse */
  "living-shelf": (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M3 7h18M3 12h18M3 17h18" />
      <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M7 7v10M12 7v10M17 7v10" />
      <circle cx="19.5" cy="4.5" r="1.5" fill="currentColor" opacity="0.9" />
    </>
  ),
  /** Taste Mirror — diamond with inner spark */
  "taste-mirror": (
    <>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        d="M12 3.5 20 12l-8 8.5L4 12 12 3.5z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        d="M12 8.5 15.5 12 12 15.5 8.5 12 12 8.5z"
      />
    </>
  ),
  /** Night Desk — candle on plane */
  "night-desk": (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M4 19h16" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        d="M10 19v-3h4v3"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        d="M9.5 16c-1.8-1.2-2.5-3-2.5-5a5 5 0 0 1 10 0c0 2-.7 3.8-2.5 5H9.5z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" d="M12 6.5c0-1 .6-2 1.2-2.5" />
    </>
  ),
  /** Lantern — cage + glow */
  lantern: (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M9 5h6M12 5v2" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        d="M8 7h8l1 3v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10l1-3z"
      />
      <circle cx="12" cy="13" r="2" fill="currentColor" opacity="0.85" />
    </>
  ),
};
