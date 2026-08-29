/**
 * Self-hosted icon paths (Creative Sprint 20).
 * No Iconify runtime CDN — critical chrome ships as local SVG.
 * ViewBox 0 0 24 24, ~1.75 stroke for optical consistency.
 */

import type { NexusIconName } from "./registry";

export const ICON_VIEWBOX = "0 0 24 24";

/** Path/children for each icon — omit = fall back to unicode glyph */
export const ICON_SVG: Partial<
  Record<NexusIconName, React.ReactNode>
> = {
  home: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
    />
  ),
  browse: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </>
  ),
  shelf: (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
      <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M7 6v12M12 6v12M17 6v12" />
    </>
  ),
  taste: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"
    />
  ),
  archive: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7zm0 0 1.5-3h13L20 7M9 12h6"
    />
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M12 12 18 6" />
    </>
  ),
  oracle: (
    <>
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M8 20h8M10 20v-3h4v3" />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" d="M9 17c-2-1.5-3-3.5-3-6a6 6 0 1 1 12 0c0 2.5-1 4.5-3 6H9z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="m16 16 4.5 4.5" />
    </>
  ),
  settings: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0 0V4m0 16v-4.5m5.5-3.5H22M2 12h4.5m9.4-5.4 3.2-3.2M5 19.5l3.2-3.2m0-8.6L5 4.5m13.5 15-3.2-3.2"
    />
  ),
  account: (
    <>
      <circle cx="12" cy="9" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
    </>
  ),
  tools: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.5 5.5 18 2l4 4-3.5 3.5M14.5 5.5 4 16v4h4L18.5 9.5"
    />
  ),
  daily: (
    <>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.5-6.5L17 7M7 17l-1.5 1.5M17 17l1.5 1.5M7 7 5.5 5.5" />
    </>
  ),
  seasonal: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 4h10a1 1 0 0 1 1 1v14l-6-3-6 3V5a1 1 0 0 1 1-1z"
    />
  ),
  journey: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 18c2-4 4-6 8-6s6 2 8 6M12 12V5m0 0 3 3M12 5 9 8"
    />
  ),
  /** Proprietary-leaning marks */
  seal: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.85" />
    </>
  ),
  signal: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      d="M3 14c2-4 4-6 9-6s7 2 9 6M6 17c1.5-2.5 3-3.5 6-3.5s4.5 1 6 3.5M10.5 20c.5-.8 1-1 1.5-1s1 .2 1.5 1"
    />
  ),
  sauce: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  challenge: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
    </>
  ),
  stats: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      d="M5 19V10m7 9V5m7 14v-7"
    />
  ),
  compare: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 8H3m4 0L5 6m2 2L5 10M17 16h4m-4 0 2-2m-2 2 2 2M9 12h6"
    />
  ),
  "theme-light": (
    <>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.5-6.5L17 7M7 17l-1.5 1.5M17 17l1.5 1.5M7 7 5.5 5.5" />
    </>
  ),
  "theme-dark": (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      d="M19 13.5A7.5 7.5 0 1 1 10.5 5 6 6 0 0 0 19 13.5z"
    />
  ),
  success: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 12.5 10 17.5 19 7"
    />
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M12 8v5m0 3h.01" />
    </>
  ),
  empty: (
    <circle
      cx="12"
      cy="12"
      r="8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeDasharray="3 3"
    />
  ),
};

export function hasLocalSvg(name: NexusIconName): boolean {
  return name in ICON_SVG && ICON_SVG[name] != null;
}
