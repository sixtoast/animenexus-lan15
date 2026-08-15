/**
 * Sprint 20 — Visual polish constants
 *
 * Shared palette, material defaults, and lighting for readability
 * at small sizes (mobile dock) and on light/dark UI.
 */

export const PALETTE = {
  /** Skin / body peach */
  skin: "#f2c4b8",
  skinDeep: "#e8a598",
  /** Cheeks */
  blush: "#f0a090",
  /** Eyes — high contrast for small screens */
  eye: "#1a100c",
  eyeHighlight: "#ffffff",
  /** Mouth */
  mouth: "#c4786a",
  /** Lantern tip glow */
  tip: "#ffb4a4",
  tipEmissive: "#ff9a88",
  /** Habitat pad */
  padFill: "#f0a090",
  padEdge: "#ffc4b4",
  platform: "#3a2e28",
} as const;

export const MATERIALS = {
  skin: {
    color: PALETTE.skin,
    roughness: 0.42,
    metalness: 0.04,
  },
  body: {
    color: PALETTE.skinDeep,
    roughness: 0.48,
    metalness: 0.05,
  },
  eye: {
    color: PALETTE.eye,
    roughness: 0.35,
    metalness: 0.1,
  },
  tip: {
    color: PALETTE.tip,
    emissive: PALETTE.tipEmissive,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.08,
  },
  blush: {
    color: PALETTE.blush,
    roughness: 0.55,
    transparent: true,
    opacity: 0.55,
  },
} as const;

/** Lighting recipe for the orthographic live terrain (Actor path). */
export const LIVE_LIGHTING = {
  ambient: { intensity: 1.05, color: "#fff8f5" },
  key: {
    position: [2.2, 3.2, 5] as [number, number, number],
    intensity: 1.15,
    color: "#fff5f0",
  },
  fill: {
    position: [-2.2, 1.2, 3] as [number, number, number],
    intensity: 0.45,
    color: "#e8d0c8",
  },
  rim: {
    position: [0.8, -0.4, 2.5] as [number, number, number],
    intensity: 0.55,
    distance: 6,
    color: "#f0a090",
  },
} as const;

/** Perspective habitat scene (MascotScene path). */
export const HABITAT_LIGHTING = {
  ambient: { intensity: 0.6, color: "#fff8f5" },
  key: {
    position: [2.5, 4, 3] as [number, number, number],
    intensity: 1.2,
    color: "#fff5f0",
  },
  fill: {
    position: [-2, 1.2, 2] as [number, number, number],
    intensity: 0.4,
    color: "#f0a090",
  },
  contactShadow: {
    opacity: 0.32,
    scale: 4,
    blur: 2.4,
    far: 2,
  },
} as const;

/** Canvas GL defaults for readability */
export const CANVAS_GL = {
  full: {
    alpha: true,
    antialias: true,
    powerPreference: "high-performance" as const,
    failIfMajorPerformanceCaveat: false,
    premultipliedAlpha: true,
  },
  lowPower: {
    alpha: true,
    antialias: false,
    powerPreference: "low-power" as const,
    failIfMajorPerformanceCaveat: false,
    premultipliedAlpha: true,
  },
} as const;
